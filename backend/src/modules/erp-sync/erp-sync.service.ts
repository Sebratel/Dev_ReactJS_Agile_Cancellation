import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AuditAction,
  CancellationStatus,
  CollectionStatus,
  IntegrationEventStatus,
  InvoiceStatus,
  PaymentPromiseStatus,
  Prisma,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Pool } from 'pg';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { getErpSyncConfig, type ErpSyncDbConfig } from '@/config/erp-sync.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import {
  IngestCollectionCasesDto,
  IngestCollectionEventDto,
} from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import { WebhooksService } from '@/modules/webhooks/webhooks.service';
import {
  ERP_SYNC_SOURCE,
  mapErpRowsToIngestPayload,
  mapContractStatus,
  type ErpEligibleRow,
} from '@/modules/erp-sync/erp-sync.mapper';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { RecoveryNotifierService } from '@/modules/erp-sync/recovery-notifier.service';
import {
  buildRecoveryNotifications,
  buildRecoveryWebhookPayload,
  type RecoveredCaseForNotification,
} from '@/modules/erp-sync/recovery-notifications.builder';
import {
  buildCancellationNotifications,
  type CancelledCaseForNotification,
} from '@/modules/erp-sync/cancellation-notifications.builder';
import {
  isContractRegularized,
  isContractRenegotiated,
  resolveRecoveredCaseIds,
  type ErpContractReconcileStatus,
} from '@/modules/erp-sync/reconcile-classification';

/**
 * Elegibilidade: contratos com 2 vencimentos consecutivos em aberto (ontem e
 * ontem menos 1 mes). A CTE isola a elegibilidade por contrato; a consulta
 * externa traz todos os titulos em aberto desses contratos (nao so os 2 que
 * dispararam o gatilho), para computar o valor total devido.
 */
const ELIGIBILITY_QUERY = `
WITH eligible_contracts AS (
  SELECT c.id AS contract_id
  FROM erp.financial_receivable_titles fr
  LEFT JOIN erp.financers_natures fn ON fn.id = fr.financer_nature_id
  LEFT JOIN erp.financial_receipt_titles x ON x.financial_receivable_title_id = fr.id
  LEFT JOIN erp.contracts c ON c.id = fr.contract_id
  LEFT JOIN erp.contract_types ct ON ct.id = c.contract_type_id
  WHERE fr.bill_title_id IS NULL
    AND fn.title <> 'DF - TARIFA BAIXA DE TÍTULO'
    AND fr.renegotiated IS false
    AND fr.deleted IS false
    AND x.client_paid_date IS NULL
    AND c.v_status IN ('Bloqueio Financeiro', 'Normal')
    AND DATE(fr.expiration_date) IN (
      CURRENT_DATE - INTERVAL '1 day',
      (CURRENT_DATE - INTERVAL '1 day') - INTERVAL '1 month')
    AND ct.title NOT IN ('Sebratel - Fat. Especial')
  GROUP BY c.id
  HAVING COUNT(DISTINCT DATE(fr.expiration_date)) = 2
)
SELECT
  p.id::text               AS erp_client_id,
  p.tx_id                   AS document,
  p.name,
  p.email,
  p.phone,
  c.id::text                AS erp_contract_id,
  c.public_id::text         AS contract_external_id,
  c.contract_number::text   AS contract_number,
  c.v_status::text          AS erp_contract_status,
  c.date                     AS contract_date,
  c.amount                   AS contract_monthly_amount,
  ct.title                   AS plan_title,
  fr.id::text                AS title_external_id,
  fr.title                   AS invoice_number,
  fr.title_amount,
  fr.balance                 AS outstanding_amount,
  fr.expiration_date
FROM eligible_contracts ec
JOIN erp.contracts c ON c.id = ec.contract_id
JOIN erp.people p ON p.id = c.client_id
LEFT JOIN erp.contract_types ct ON ct.id = c.contract_type_id
JOIN erp.financial_receivable_titles fr ON fr.contract_id = c.id
LEFT JOIN erp.financial_receipt_titles x ON x.financial_receivable_title_id = fr.id
WHERE fr.deleted IS false
  AND fr.bill_title_id IS NULL
  AND fr.renegotiated IS false
  AND x.client_paid_date IS NULL
ORDER BY c.id, fr.expiration_date;
`;

const OPEN_TITLES_BY_CONTRACT_QUERY = `
SELECT
  c.public_id::text AS contract_external_id,
  c.v_status::text  AS erp_contract_status,
  fr.id::text       AS title_external_id,
  fr.title_amount,
  fr.balance        AS outstanding_amount,
  fr.expiration_date
FROM erp.contracts c
JOIN erp.financial_receivable_titles fr ON fr.contract_id = c.id
LEFT JOIN erp.financers_natures fn ON fn.id = fr.financer_nature_id
LEFT JOIN erp.financial_receipt_titles x ON x.financial_receivable_title_id = fr.id
LEFT JOIN erp.contract_types ct ON ct.id = c.contract_type_id
WHERE c.public_id = ANY($1::uuid[])
  AND fr.bill_title_id IS NULL
  AND fn.title <> 'DF - TARIFA BAIXA DE TÍTULO'
  AND fr.renegotiated IS false
  AND fr.deleted IS false
  AND x.client_paid_date IS NULL
  AND c.v_status IN ('Bloqueio Financeiro', 'Normal')
  AND DATE(fr.expiration_date) < CURRENT_DATE
  AND ct.title NOT IN ('Sebratel - Fat. Especial')
ORDER BY c.public_id, fr.expiration_date;
`;

type ErpOpenTitleRow = {
  contract_external_id: string;
  erp_contract_status: string | null;
  title_external_id: string;
  title_amount: string;
  outstanding_amount: string;
  expiration_date: Date;
};

// Estado REAL do contrato no ERP para os casos que sumiram da regra — SEM o
// filtro de v_status elegivel, para distinguir pagamento de cancelamento.
// Retorna o status atual e a contagem de titulos vencidos em aberto.
const CONTRACT_RECONCILE_STATUS_QUERY = `
SELECT
  c.public_id::text AS contract_external_id,
  c.v_status::text  AS erp_contract_status,
  COUNT(fr.id) FILTER (
    WHERE fr.bill_title_id IS NULL
      AND fr.renegotiated IS false
      AND fr.deleted IS false
      AND x.client_paid_date IS NULL
      AND DATE(fr.expiration_date) < CURRENT_DATE
  )::int AS open_overdue_titles,
  -- Houve renegociacao no contrato (titulo original vira renegotiated=true).
  BOOL_OR(fr.renegotiated IS true) AS has_renegotiation,
  -- Saldo em aberto: titulos nao renegociados, nao pagos, com saldo > 0,
  -- qualquer vencimento, fora as tarifas de baixa de titulo.
  COALESCE(SUM(fr.balance) FILTER (
    WHERE fr.bill_title_id IS NULL
      AND fr.renegotiated IS false
      AND fr.deleted IS false
      AND x.client_paid_date IS NULL
      AND COALESCE(fn.title, '') <> 'DF - TARIFA BAIXA DE TÍTULO'
      AND fr.balance > 0
  ), 0)::float8 AS open_unpaid_balance
FROM erp.contracts c
LEFT JOIN erp.financial_receivable_titles fr ON fr.contract_id = c.id
LEFT JOIN erp.financers_natures fn ON fn.id = fr.financer_nature_id
LEFT JOIN erp.financial_receipt_titles x ON x.financial_receivable_title_id = fr.id
WHERE c.public_id = ANY($1::uuid[])
GROUP BY c.public_id, c.v_status;
`;

type ErpContractReconcileStatusRow = {
  contract_external_id: string;
  erp_contract_status: string | null;
  open_overdue_titles: number;
  has_renegotiation: boolean | null;
  open_unpaid_balance: number | string | null;
};

@Injectable()
export class ErpSyncService {
  private readonly logger = new Logger(ErpSyncService.name);
  private pool: Pool | null = null;
  private isScheduledSyncRunning = false;

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly recoveryNotifier: RecoveryNotifierService,
  ) {}

  @Cron('*/10 * * * *')
  handleScheduledSync(): void {
    // Evita sobreposicao: se a rodada anterior ainda nao terminou, pula esta
    // (nao adianta empilhar consultas pesadas no ERP a cada 10 min).
    if (this.isScheduledSyncRunning) {
      this.logger.warn(
        'Sincronizacao ERP anterior ainda em andamento — pulando esta rodada.',
      );
      return;
    }

    this.isScheduledSyncRunning = true;
    void this.runSync().finally(() => {
      this.isScheduledSyncRunning = false;
    });
  }

  async runSync(): Promise<void> {
    const config = getErpSyncConfig();

    if (!config.enabled || !config.db) {
      return;
    }

    if (getDataSourceMode() !== 'database') {
      this.logger.warn(
        'ERP_SYNC_ENABLED=true mas DATA_SOURCE_MODE != database — sincronizacao ignorada.',
      );
      return;
    }

    this.logger.log('Iniciando sincronizacao com o ERP...');

    let rows: ErpEligibleRow[];

    try {
      const pool = this.getPool(config.db);
      const result = await pool.query<ErpEligibleRow>(ELIGIBILITY_QUERY);
      rows = result.rows;
    } catch (error) {
      this.logger.error(
        'Falha ao consultar o ERP.',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    if (rows.length === 0) {
      this.logger.log('Nenhum contrato elegivel encontrado nesta rodada.');
    }

    const { payload, skippedContracts } = mapErpRowsToIngestPayload(rows);

    // Observabilidade do inflow: a entrada de casos e intermitente (so dispara
    // nos dias seguintes a uma data de faturamento pesada). Registrar a
    // contagem a cada rodada facilita distinguir "janela de silencio esperada"
    // de "feed realmente parado".
    this.logger.log(
      `ERP sync: ${rows.length} linha(s) elegivel(is), ${payload.events.length} contrato(s) candidato(s) a ingestao.`,
    );

    if (skippedContracts > 0) {
      this.logger.warn(
        `${skippedContracts} contrato(s) ignorado(s) por falta de documento (CPF/CNPJ) no ERP.`,
      );
    }

    // Valida evento a evento: um registro invalido do ERP (ex.: e-mail mal
    // formatado) e descartado sozinho, sem derrubar a rodada inteira.
    const validEvents = payload.events.filter((event) => {
      const eventInstance = plainToInstance(IngestCollectionEventDto, event);
      const eventErrors = validateSync(eventInstance);

      if (eventErrors.length > 0) {
        this.logger.warn(
          `Evento descartado (contrato externalId=${event.externalId}): ${JSON.stringify(
            eventErrors,
          )}`,
        );
        return false;
      }

      return true;
    });

    if (payload.events.length > 0 && validEvents.length === 0) {
      await this.reconcileRecoveredCases();
      this.logger.warn('Nenhum evento valido apos validacao — rodada encerrada.');
      return;
    }

    if (validEvents.length > 0) {
      const dto = plainToInstance(IngestCollectionCasesDto, {
        ...payload,
        events: validEvents,
      });
      const response = await this.webhooksService.ingestCollectionCases(dto);
      this.logger.log(
        `Sincronizacao concluida: ${JSON.stringify(response.data)}`,
      );
    }

    await this.reconcileRecoveredCases();
  }

  private async reconcileRecoveredCases(): Promise<void> {
    const activeSyncedCases = await this.prisma.collectionCase.findMany({
      where: {
        externalId: { not: null },
        status: {
          notIn: [
            CollectionStatus.CLOSED,
            CollectionStatus.RECOVERED,
            CollectionStatus.PAYMENT_MADE,
          ],
        },
        contract: {
          externalId: { not: null },
        },
      },
      select: {
        id: true,
        externalId: true,
        status: true,
        outstandingAmount: true,
        daysOverdue: true,
        contractId: true,
        cycleStartedAt: true,
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        customer: {
          select: { name: true },
        },
        paymentPromises: {
          where: { status: PaymentPromiseStatus.ACTIVE },
          select: { id: true },
          take: 1,
        },
        cancellationProcesses: {
          select: {
            id: true,
            status: true,
          },
        },
        contract: {
          select: {
            externalId: true,
          },
        },
      },
    });

    const syncedCases = activeSyncedCases.filter(
      (collectionCase) =>
        collectionCase.externalId === collectionCase.contract.externalId &&
        collectionCase.externalId !== null,
    );

    if (syncedCases.length === 0) {
      this.logger.log('Nenhum caso sincronizado pelo ERP para reconciliar.');
      return;
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const contractExternalIds = syncedCases
      .map((collectionCase) => collectionCase.externalId)
      .filter((externalId): externalId is string =>
        Boolean(externalId && uuidPattern.test(externalId)),
      );

    if (contractExternalIds.length === 0) {
      this.logger.warn(
        'Nenhum externalId de contrato valido para reconciliacao ERP.',
      );
      return;
    }

    const config = getErpSyncConfig();

    if (!config.db) {
      return;
    }

    let openTitleRows: ErpOpenTitleRow[];

    try {
      const pool = this.getPool(config.db);
      const result = await pool.query<ErpOpenTitleRow>(
        OPEN_TITLES_BY_CONTRACT_QUERY,
        [contractExternalIds],
      );
      openTitleRows = result.rows;
    } catch (error) {
      this.logger.error(
        'Falha ao reconciliar casos recuperados com o ERP.',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    const openTitlesByContract = new Map<string, ErpOpenTitleRow[]>();

    for (const row of openTitleRows) {
      const bucket = openTitlesByContract.get(row.contract_external_id);

      if (bucket) {
        bucket.push(row);
      } else {
        openTitlesByContract.set(row.contract_external_id, [row]);
      }
    }

    const casesToRecover = syncedCases.filter(
      (collectionCase) =>
        collectionCase.externalId !== null &&
        !openTitlesByContract.has(collectionCase.externalId),
    );
    const now = new Date();

    const casesToRefresh = syncedCases
      .map((collectionCase) => {
        const openTitles =
          collectionCase.externalId !== null
            ? openTitlesByContract.get(collectionCase.externalId)
            : undefined;

        if (!openTitles || openTitles.length === 0) {
          return null;
        }

        const outstandingAmount = openTitles.reduce(
          (total, title) => total + Number(title.outstanding_amount),
          0,
        );
        const oldestExpiration = openTitles.reduce<Date | null>(
          (oldest, title) =>
            !oldest || title.expiration_date < oldest
              ? title.expiration_date
              : oldest,
          null,
        );
        const daysOverdue = oldestExpiration
          ? Math.max(
              0,
              Math.floor(
                (now.getTime() - oldestExpiration.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 0;

        return {
          id: collectionCase.id,
          contractId: collectionCase.contractId,
          contractStatus: mapContractStatus(openTitles[0]?.erp_contract_status),
          outstandingAmount,
          daysOverdue,
        };
      })
      .filter(
        (
          collectionCase,
        ): collectionCase is {
          id: string;
          contractId: string;
          contractStatus: ReturnType<typeof mapContractStatus>;
          outstandingAmount: number;
          daysOverdue: number;
        } => collectionCase !== null,
      );

    if (casesToRecover.length === 0 && casesToRefresh.length === 0) {
      this.logger.log('Nenhum caso recuperado para reconciliar nesta rodada.');
      return;
    }

    // Classifica os casos que sumiram da regra: pagamento (regularizou) x
    // cancelamento/mudança de status. Sem isso, um contrato cancelado era
    // creditado como "recuperado" e disparava notificação falsa.
    const recoverExternalIds = casesToRecover
      .map((collectionCase) => collectionCase.externalId)
      .filter(
        (externalId): externalId is string =>
          Boolean(externalId && uuidPattern.test(externalId)),
      );

    const contractStatusByExternalId = new Map<
      string,
      ErpContractReconcileStatus
    >();

    if (recoverExternalIds.length > 0) {
      try {
        const pool = this.getPool(config.db);
        const statusResult = await pool.query<ErpContractReconcileStatusRow>(
          CONTRACT_RECONCILE_STATUS_QUERY,
          [recoverExternalIds],
        );

        for (const row of statusResult.rows) {
          contractStatusByExternalId.set(row.contract_external_id, {
            erpContractStatus: row.erp_contract_status,
            openOverdueTitles: Number(row.open_overdue_titles),
            hasRenegotiation: row.has_renegotiation === true,
            openUnpaidBalance: Number(row.open_unpaid_balance ?? 0),
          });
        }
      } catch (error) {
        this.logger.error(
          'Falha ao classificar casos (pagamento x cancelamento) no ERP. Reconciliacao abortada nesta rodada.',
          error instanceof Error ? error.stack : String(error),
        );
        return;
      }
    }

    const statusFor = (collectionCase: { externalId: string | null }) =>
      collectionCase.externalId
        ? contractStatusByExternalId.get(collectionCase.externalId)
        : undefined;

    const paidCases = casesToRecover.filter((collectionCase) =>
      isContractRegularized(statusFor(collectionCase)),
    );
    const paidCaseIdSet = new Set(paidCases.map((c) => c.id));

    // Renegociacao (nao e pagamento): renegociou a fatura e ainda deve. Nao
    // credita recuperacao nem notifica "regularizou"; fica com desfecho proprio
    // RENEGOTIATED. Se cancelar depois, cai no bucket de cancelados.
    const renegotiatedCases = casesToRecover.filter(
      (collectionCase) =>
        !paidCaseIdSet.has(collectionCase.id) &&
        isContractRenegotiated(statusFor(collectionCase)),
    );
    const renegotiatedCaseIdSet = new Set(renegotiatedCases.map((c) => c.id));
    const renegotiatedCaseIds = renegotiatedCases.map((c) => c.id);

    const cancelledCases = casesToRecover.filter(
      (collectionCase) =>
        !paidCaseIdSet.has(collectionCase.id) &&
        !renegotiatedCaseIdSet.has(collectionCase.id),
    );

    // Efeitos de "recuperado" valem SÓ para quem pagou de fato.
    const caseIds = paidCases.map((collectionCase) => collectionCase.id);
    const contractIds = [
      ...new Set(paidCases.map((collectionCase) => collectionCase.contractId)),
    ];
    const cancelledCaseIds = cancelledCases.map(
      (collectionCase) => collectionCase.id,
    );
    const cancellableProcessStatuses: CancellationStatus[] = [
      CancellationStatus.PENDING,
      CancellationStatus.IN_PROGRESS,
      CancellationStatus.AWAITING_PROTOCOL,
      CancellationStatus.AWAITING_PICKUP,
    ];

    await this.prisma.$transaction(async (tx) => {
      for (const collectionCase of casesToRefresh) {
        await tx.contract.update({
          where: { id: collectionCase.contractId },
          data: {
            status: collectionCase.contractStatus,
            updatedAt: now,
          },
        });

        await tx.collectionCase.update({
          where: { id: collectionCase.id },
          data: {
            outstandingAmount: collectionCase.outstandingAmount,
            daysOverdue: collectionCase.daysOverdue,
            updatedAt: now,
          },
        });
      }

      // Atualiza o status do contrato tambem para os casos que sairam da regra
      // (pagos/cancelados), usando o v_status atual do ERP — senao ficaria
      // preso no valor antigo (ex.: pagou, saiu do Bloqueio Financeiro no ERP,
      // mas continuava SUSPENDED na plataforma).
      for (const collectionCase of casesToRecover) {
        const erpStatus = collectionCase.externalId
          ? contractStatusByExternalId.get(collectionCase.externalId)
              ?.erpContractStatus
          : null;

        if (erpStatus) {
          await tx.contract.update({
            where: { id: collectionCase.contractId },
            data: { status: mapContractStatus(erpStatus), updatedAt: now },
          });
        }
      }

      const invoicesToMarkAsPaid = await tx.invoice.findMany({
        where: {
          contractId: { in: contractIds },
          status: {
            in: [
              InvoiceStatus.OPEN,
              InvoiceStatus.OVERDUE,
              InvoiceStatus.PARTIALLY_PAID,
            ],
          },
        },
        select: {
          id: true,
          amount: true,
        },
      });

      for (const invoice of invoicesToMarkAsPaid) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            paidAmount: invoice.amount,
          },
        });
      }

      // Distingue quem foi RECUPERADO por um atendente (teve pelo menos 1
      // tentativa manual antes de pagar) de quem so PAGOU sem atendimento
      // (PAYMENT_MADE). Assim a supervisao/ranking nao credita ao atendente um
      // pagamento espontaneo.
      const manualAttempts = await tx.collectionAttempt.findMany({
        where: { collectionCaseId: { in: caseIds }, isAutomatic: false },
        select: { collectionCaseId: true, attemptedAt: true },
      });
      // Conta só as tentativas manuais do ciclo ATUAL (a partir do
      // cycleStartedAt), para não creditar recuperação por tentativas herdadas
      // de um ciclo anterior (caso reaberto).
      const cycleStartByCase = new Map<string, Date | null>(
        paidCases.map((collectionCase) => [
          collectionCase.id,
          collectionCase.cycleStartedAt ?? null,
        ]),
      );
      const recoveredIds = resolveRecoveredCaseIds(
        manualAttempts,
        cycleStartByCase,
      );
      const recoveredCaseIds = caseIds.filter((id) => recoveredIds.has(id));
      const paidCaseIds = caseIds.filter((id) => !recoveredIds.has(id));

      if (recoveredCaseIds.length > 0) {
        await tx.collectionCase.updateMany({
          where: { id: { in: recoveredCaseIds } },
          data: {
            status: CollectionStatus.RECOVERED,
            recoveredAt: now,
            outstandingAmount: 0,
            daysOverdue: 0,
            updatedAt: now,
          },
        });
      }

      if (paidCaseIds.length > 0) {
        await tx.collectionCase.updateMany({
          where: { id: { in: paidCaseIds } },
          data: {
            status: CollectionStatus.PAYMENT_MADE,
            recoveredAt: now,
            outstandingAmount: 0,
            daysOverdue: 0,
            updatedAt: now,
          },
        });
      }

      await tx.cancellationProcess.updateMany({
        where: {
          collectionCaseId: { in: caseIds },
          status: { in: cancellableProcessStatuses },
        },
        data: {
          status: CancellationStatus.CANCELLED,
          completedAt: now,
        },
      });

      for (const collectionCase of paidCases) {
        await tx.auditLog.create({
          data: {
            entityType: 'COLLECTION_CASE',
            entityId: collectionCase.id,
            action: AuditAction.STATUS_CHANGE,
            beforeSnapshot: {
              status: collectionCase.status,
              outstandingAmount: collectionCase.outstandingAmount.toString(),
              daysOverdue: collectionCase.daysOverdue,
            },
            afterSnapshot: {
              status: recoveredIds.has(collectionCase.id)
                ? CollectionStatus.RECOVERED
                : CollectionStatus.PAYMENT_MADE,
              outstandingAmount: '0',
              daysOverdue: 0,
              recoveredAt: now.toISOString(),
            },
            metadata: {
              resourceType: 'COLLECTION_CASE',
              action: 'ERP_SYNC_RECOVERY_RECONCILIATION',
              source: ERP_SYNC_SOURCE,
              reason: 'Contrato nao retornou mais na regra de elegibilidade do ERP.',
              externalId: collectionCase.externalId,
              cancelledCancellationProcessIds:
                collectionCase.cancellationProcesses
                  .filter((process) =>
                    cancellableProcessStatuses.includes(process.status),
                  )
                  .map((process) => process.id),
            },
          },
        });
      }

      // Casos que sairam da regra por CANCELAMENTO (nao pagamento): encerra o
      // caso (para nao reprocessar/renotificar a cada rodada) SEM creditar
      // recuperacao (recoveredAt fica nulo).
      if (cancelledCaseIds.length > 0) {
        await tx.collectionCase.updateMany({
          where: { id: { in: cancelledCaseIds } },
          data: {
            status: CollectionStatus.CLOSED,
            updatedAt: now,
          },
        });

        for (const collectionCase of cancelledCases) {
          await tx.auditLog.create({
            data: {
              entityType: 'COLLECTION_CASE',
              entityId: collectionCase.id,
              action: AuditAction.STATUS_CHANGE,
              beforeSnapshot: {
                status: collectionCase.status,
                outstandingAmount: collectionCase.outstandingAmount.toString(),
                daysOverdue: collectionCase.daysOverdue,
              },
              afterSnapshot: {
                status: CollectionStatus.CLOSED,
              },
              metadata: {
                resourceType: 'COLLECTION_CASE',
                action: 'ERP_SYNC_CANCELLATION_RECONCILIATION',
                source: ERP_SYNC_SOURCE,
                reason:
                  'Contrato saiu da regra do ERP por cancelamento/mudanca de status (nao houve pagamento).',
                externalId: collectionCase.externalId,
              },
            },
          });
        }
      }

      // Casos que sairam da regra por RENEGOCIACAO (nao pagamento): encerra o
      // caso como RENEGOTIATED, SEM creditar recuperacao (recoveredAt nulo). O
      // status do contrato ja foi atualizado no loop de casesToRecover acima.
      if (renegotiatedCaseIds.length > 0) {
        await tx.collectionCase.updateMany({
          where: { id: { in: renegotiatedCaseIds } },
          data: {
            status: CollectionStatus.RENEGOTIATED,
            recoveredAt: null,
            updatedAt: now,
          },
        });

        for (const collectionCase of renegotiatedCases) {
          await tx.auditLog.create({
            data: {
              entityType: 'COLLECTION_CASE',
              entityId: collectionCase.id,
              action: AuditAction.STATUS_CHANGE,
              beforeSnapshot: {
                status: collectionCase.status,
                outstandingAmount: collectionCase.outstandingAmount.toString(),
                daysOverdue: collectionCase.daysOverdue,
              },
              afterSnapshot: {
                status: CollectionStatus.RENEGOTIATED,
              },
              metadata: {
                resourceType: 'COLLECTION_CASE',
                action: 'ERP_SYNC_RENEGOTIATION_RECONCILIATION',
                source: ERP_SYNC_SOURCE,
                reason:
                  'Contrato saiu da regra do ERP por renegociacao (titulo renegociado + saldo em aberto). Nao houve pagamento.',
                externalId: collectionCase.externalId,
              },
            },
          });
        }
      }

      await tx.integrationEvent.create({
        data: {
          source: ERP_SYNC_SOURCE,
          eventType: 'collection_cases.reconcile_recovered',
          status: IntegrationEventStatus.COMPLETED,
          payload: {
            recoveredCases: paidCases.length,
            renegotiatedCases: renegotiatedCases.length,
            cancelledCases: cancelledCases.length,
            refreshedCases: casesToRefresh.length,
            refreshedContracts: casesToRefresh.length,
            checkedCases: syncedCases.length,
            openTitles: openTitleRows.length,
            recoveredExternalIds: paidCases.map(
              (collectionCase) => collectionCase.externalId,
            ),
            renegotiatedExternalIds: renegotiatedCases.map(
              (collectionCase) => collectionCase.externalId,
            ),
            cancelledExternalIds: cancelledCases.map(
              (collectionCase) => collectionCase.externalId,
            ),
          },
          processedAt: now,
        },
      });
    }, {
      maxWait: 10_000,
      timeout: 120_000,
    });

    this.logger.log(
      `Reconciliacao ERP concluida: ${paidCases.length} recuperado(s), ${renegotiatedCases.length} renegociado(s), ${cancelledCases.length} cancelado(s).`,
    );

    // Notifica apos o commit — nunca dentro da transacao. Falhas aqui sao
    // engolidas para nao reverter o que ja foi persistido.
    await this.dispatchRecoveryNotifications(paidCases);
    await this.dispatchCancellationNotifications(cancelledCases);
  }

  private async dispatchCancellationNotifications(
    cancelled: Array<{
      id: string;
      customer: { name: string } | null;
      assignedUser: { id: string; name: string; email: string | null } | null;
    }>,
  ): Promise<void> {
    if (cancelled.length === 0) {
      return;
    }

    try {
      const cases: CancelledCaseForNotification[] = cancelled.map((item) => ({
        caseId: item.id,
        customerName: item.customer?.name ?? 'Cliente',
        assignedUser: item.assignedUser
          ? {
              id: item.assignedUser.id,
              name: item.assignedUser.name,
              email: item.assignedUser.email,
            }
          : null,
      }));

      const { agentNotifications, supervisorSummary } =
        buildCancellationNotifications(cases);

      for (const notification of agentNotifications) {
        await this.notificationsService.notify({
          userId: notification.userId,
          type: 'CASE_CANCELLED_EXTERNAL',
          title: notification.title,
          body: notification.body,
          entityType: 'COLLECTION_CASE',
          entityId: notification.entityId,
        });
      }

      if (supervisorSummary) {
        await this.notificationsService.notifySupervisors({
          type: 'CASES_CANCELLED_EXTERNAL_SUMMARY',
          title: supervisorSummary.title,
          body: supervisorSummary.body,
        });
      }
    } catch (error) {
      this.logger.error(
        'Falha ao enviar notificacoes de cancelamento externo.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async dispatchRecoveryNotifications(
    recovered: Array<{
      id: string;
      outstandingAmount: Prisma.Decimal;
      customer: { name: string } | null;
      assignedUser: { id: string; name: string; email: string | null } | null;
      paymentPromises: Array<{ id: string }>;
    }>,
  ): Promise<void> {
    if (recovered.length === 0) {
      return;
    }

    try {
      const cases: RecoveredCaseForNotification[] = recovered.map((item) => ({
        caseId: item.id,
        customerName: item.customer?.name ?? 'Cliente',
        recoveredAmount: Number(item.outstandingAmount),
        assignedUser: item.assignedUser
          ? {
              id: item.assignedUser.id,
              name: item.assignedUser.name,
              email: item.assignedUser.email,
            }
          : null,
        hadActivePromise: item.paymentPromises.length > 0,
      }));

      const { agentNotifications, supervisorSummary } =
        buildRecoveryNotifications(cases);

      // Sino interno: uma notificacao por atendente responsavel.
      for (const notification of agentNotifications) {
        await this.notificationsService.notify({
          userId: notification.userId,
          type: 'CASE_RECOVERED',
          title: notification.title,
          body: notification.body,
          entityType: 'COLLECTION_CASE',
          entityId: notification.entityId,
        });
      }

      // Sino interno: um unico resumo consolidado para a supervisao.
      if (supervisorSummary) {
        await this.notificationsService.notifySupervisors({
          type: 'CASES_RECOVERED_SUMMARY',
          title: supervisorSummary.title,
          body: supervisorSummary.body,
        });
      }

      // Entrega externa (e-mail/WhatsApp/etc.) fica a cargo do N8N: um unico
      // POST por rodada com o lote e os destinatarios (atendente + supervisao).
      const supervisorEmails = await this.getSupervisorEmails();
      const webhookPayload = buildRecoveryWebhookPayload(
        cases,
        supervisorEmails,
      );

      if (webhookPayload) {
        await this.recoveryNotifier.dispatch(webhookPayload);
      }
    } catch (error) {
      this.logger.error(
        'Falha ao enviar notificacoes de recuperacao.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async getSupervisorEmails(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userRoles: {
          some: { role: { code: { in: ['ADMIN', 'SUPERVISOR'] } } },
        },
      },
      select: { email: true },
    });

    return users
      .map((user) => user.email)
      .filter((email): email is string => Boolean(email));
  }

  private getPool(db: ErpSyncDbConfig): Pool {
    this.pool ??= new Pool({
      host: db.host,
      port: db.port,
      database: db.database,
      user: db.user,
      password: db.password,
      max: 2,
      ssl: false,
    });

    return this.pool;
  }
}
