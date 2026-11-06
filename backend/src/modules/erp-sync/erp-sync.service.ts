import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  CANCELLED_RECOVERY_PAYMENT_WINDOW_DAYS,
  resolveCancelledRecoveryOutcome,
  type CancelledRecoveryErpState,
} from '@/modules/erp-sync/cancelled-recovery';
import type { RenegotiationSummaryResponse } from '@/modules/erp-sync/dto/renegotiation-summary.response';
import { Cron } from '@nestjs/schedule';
import {
  AuditAction,
  CancellationStatus,
  CollectionStatus,
  ContractStatus,
  IntegrationEventStatus,
  InvoiceStatus,
  PaymentPromiseStatus,
  Prisma,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Pool } from 'pg';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { retryOnWriteConflict } from '@/common/utils/retry-on-write-conflict.util';
import {
  getErpSyncConfig,
  type ErpSyncDbConfig,
} from '@/config/erp-sync.config';
import type {
  RenegotiationDetailResponse,
  RenegotiationTitle,
} from '@/modules/erp-sync/dto/renegotiation-detail.response';
import type {
  RenegotiatedHistoryItem,
  RenegotiatedHistoryResponse,
} from '@/modules/collection-cases/dto/renegotiated-history.response';

// Histórico REAL de renegociações do ERP (tabela financial_renegotiations),
// ligado ao contrato pelos títulos envolvidos. É a fonte correta de "quem
// renegociou e quando" — o flag `renegotiated` do título é só um resquício.
// Exclui contratos CANCELADOS: a equipe de cancelamento, ao encerrar no Elleven,
// primeiro renegocia e depois cancela o contrato — então quase todo contrato
// cancelado tem uma "renegociação" que é só artefato do fluxo de cancelamento,
// não uma renegociação viva a acompanhar. A aba lista só quem renegociou E
// segue ativo (usa o v_status VIVO do ERP).
const RENEGOTIATION_HISTORY_QUERY = `
SELECT c.public_id::text AS pid,
  COUNT(DISTINCT r.id) AS reneg_count,
  MIN(r.date) AS first_date,
  MAX(r.date) AS last_date,
  COALESCE((
    -- Saldo da renegociação EM ABERTO: títulos GERADOS por renegociação (type=1)
    -- que ainda têm saldo, não foram consumidos de novo e não têm baixa real.
    SELECT SUM(g.balance)
    FROM erp.financial_renegotiation_titles grt
    JOIN erp.financial_renegotiations gr
      ON gr.id = grt.financial_renegotiation_id AND gr.deleted IS false
    JOIN erp.financial_receivable_titles g
      ON g.id = grt.financial_receivable_title_id
    WHERE grt.type = 1 AND grt.deleted IS false
      AND g.contract_id = c.id AND g.deleted IS false AND g.balance > 0
      AND NOT EXISTS (
        SELECT 1 FROM erp.financial_renegotiation_titles crt
        JOIN erp.financial_renegotiations cr
          ON cr.id = crt.financial_renegotiation_id AND cr.deleted IS false
        WHERE crt.financial_receivable_title_id = g.id
          AND crt.type = 0 AND crt.deleted IS false
      )
      AND NOT EXISTS (
        SELECT 1 FROM erp.financial_receipt_titles x
        WHERE x.financial_receivable_title_id = g.id AND x.deleted IS false
          AND x.client_paid_date IS NOT NULL AND x.payment_form_id IS NOT NULL
      )
  ), 0) AS open_reneg_balance
FROM erp.financial_renegotiations r
JOIN erp.financial_renegotiation_titles rt
  ON rt.financial_renegotiation_id = r.id AND rt.deleted IS false
JOIN erp.financial_receivable_titles t
  ON t.id = rt.financial_receivable_title_id
JOIN erp.contracts c ON c.id = t.contract_id
WHERE c.public_id = ANY($1::uuid[])
  AND r.deleted IS false
  AND c.v_status::text <> 'Cancelado'
GROUP BY c.public_id, c.id;
`;

// Detalhe da renegociação a partir da FONTE REAL: `financial_renegotiation_titles`
// (type=0 = título CONSUMIDO/renegociado; type=1 = título GERADO). NÃO usa o flag
// `fr.renegotiated`, que marca resquícios órfãos que nem o Elleven mostra
// (ex.: contrato 269033: títulos "renegociados" pelo flag não aparecem em
// Todos/Baixado/Recebido e o Elleven mostra "Renegociado: 0").
const RENEGOTIATION_DETAIL_QUERY = `
SELECT
  fr.title                         AS invoice_number,
  MAX(fn.title)                    AS nature,
  fr.title_amount::text            AS title_amount,
  fr.balance::text                 AS balance,
  fr.expiration_date               AS expiration,
  BOOL_OR(x.id IS NOT NULL)        AS paid,
  BOOL_OR(rt.type = 0)             AS was_consumed,
  BOOL_OR(rt.type = 1)             AS was_generated
FROM erp.contracts c
JOIN erp.financial_receivable_titles fr ON fr.contract_id = c.id
JOIN erp.financial_renegotiation_titles rt
  ON rt.financial_receivable_title_id = fr.id AND rt.deleted IS false
JOIN erp.financial_renegotiations r
  ON r.id = rt.financial_renegotiation_id AND r.deleted IS false
LEFT JOIN erp.financers_natures fn ON fn.id = fr.financer_nature_id
LEFT JOIN erp.financial_receipt_titles x
  ON x.financial_receivable_title_id = fr.id
 AND x.deleted IS false
 AND x.payment_form_id IS NOT NULL
WHERE c.public_id = $1::uuid
  AND fr.deleted IS false
GROUP BY fr.id, fr.title, fr.title_amount, fr.balance, fr.expiration_date
ORDER BY fr.expiration_date;
`;

type RenegotiationDetailRow = {
  invoice_number: string | null;
  nature: string | null;
  title_amount: string | null;
  balance: string | null;
  expiration: Date | null;
  paid: boolean | null;
  was_consumed: boolean | null;
  was_generated: boolean | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  resolveReconcileOutcome,
  resolveRecoveredCaseIds,
  type ErpContractReconcileStatus,
  type ReconcileOutcome,
} from '@/modules/erp-sync/reconcile-classification';

const RENEGOTIATION_SUMMARY_TTL_MS = 5 * 60_000;
const RENEGOTIATION_SUMMARY_TIMEOUT_MS = 10_000;

// Confirma PAGAMENTO REAL: dos titulos informados, quais tem baixa
// (client_paid_date). Usado como prova de que o caso foi de fato recuperado —
// e nao apenas "sumiu da regra" por adiamento/apagamento de titulo.
// IMPORTANTE: só conta como PAGAMENTO REAL a baixa que tem forma de pagamento
// (`payment_form_id`: Pix, boleto, cartão, dinheiro...). Baixa de RENEGOCIAÇÃO /
// QUITAÇÃO vem com `origin=5` e SEM forma de pagamento — não é dinheiro que o
// cliente pagou, é o título antigo sendo substituído/quitado. Sem este filtro,
// uma renegociação virava "Pagamento realizado" (receita falsa). Também
// desconsidera baixas deletadas.
const PAID_TITLES_QUERY = `
SELECT fr.id::text AS id, MIN(x.client_paid_date) AS paid_date
FROM erp.financial_receivable_titles fr
JOIN erp.financial_receipt_titles x ON x.financial_receivable_title_id = fr.id
WHERE fr.id = ANY($1::bigint[])
  AND x.client_paid_date IS NOT NULL
  AND x.payment_form_id IS NOT NULL
  AND x.deleted IS false
GROUP BY fr.id;
`;

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
  p.cell_phone_1            AS phone2,
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
  (
    -- Motivo do cancelamento mais recente (contract_events). Só faz sentido
    -- quando o contrato está cancelado; o chamador decide se usa ou limpa.
    SELECT cet.title
    FROM erp.contract_events ce2
    JOIN erp.contract_event_types cet
      ON cet.id = ce2.contract_event_type_id
    WHERE ce2.contract_id = c.id
      AND ce2.deleted IS false
      AND cet.title ILIKE 'Cancelamento%'
    ORDER BY ce2.date DESC NULLS LAST
    LIMIT 1
  ) AS cancellation_reason
FROM erp.contracts c
LEFT JOIN erp.financial_receivable_titles fr ON fr.contract_id = c.id
LEFT JOIN erp.financial_receipt_titles x ON x.financial_receivable_title_id = fr.id
WHERE c.public_id = ANY($1::uuid[])
GROUP BY c.public_id, c.id, c.v_status;
`;

// Cancelados devolvidos à carteira: status atual do contrato no ERP e data do
// último evento "Reativação de Contrato".
const CANCELLED_RECOVERY_STATE_QUERY = `
SELECT
  c.public_id::text AS contract_external_id,
  c.v_status::text  AS erp_contract_status,
  (
    SELECT MAX(ce.date)
    FROM erp.contract_events ce
    JOIN erp.contract_event_types cet ON cet.id = ce.contract_event_type_id
    WHERE ce.contract_id = c.id
      AND ce.deleted IS false
      AND cet.title = 'Reativação de Contrato'
  ) AS reactivated_at
FROM erp.contracts c
WHERE c.public_id = ANY($1::uuid[]);
`;

type CancelledRecoveryStateRow = {
  contract_external_id: string;
  erp_contract_status: string | null;
  reactivated_at: Date | null;
};

// Valor efetivamente PAGO por contrato desde a reativação (baixas reais, não
// deletadas, com forma de pagamento e data até hoje — há baixas futuras
// programadas que ainda não são pagamento).
const CANCELLED_RECOVERY_PAID_SINCE_QUERY = `
SELECT
  t.public_id::text AS contract_external_id,
  COALESCE(SUM(x.total_amount), 0)::text AS paid_amount
FROM unnest($1::uuid[], $2::date[]) AS t(public_id, since)
JOIN erp.contracts c ON c.public_id = t.public_id
JOIN erp.financial_receivable_titles fr ON fr.contract_id = c.id
JOIN erp.financial_receipt_titles x ON x.financial_receivable_title_id = fr.id
WHERE fr.deleted IS false
  AND fr.renegotiated IS false
  AND fr.bill_title_id IS NULL
  AND x.deleted IS false
  AND x.client_paid_date IS NOT NULL
  AND x.payment_form_id IS NOT NULL
  AND x.client_paid_date >= t.since
  AND x.client_paid_date <= CURRENT_DATE
GROUP BY t.public_id;
`;

type CancelledRecoveryPaidRow = {
  contract_external_id: string;
  paid_amount: string;
};

type ErpContractReconcileStatusRow = {
  contract_external_id: string;
  erp_contract_status: string | null;
  open_overdue_titles: number;
  cancellation_reason: string | null;
};

@Injectable()
export class ErpSyncService implements OnModuleDestroy {
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
    // Sem o catch, uma falha transitoria do banco (ex.: MariaDB 1020 em upsert
    // concorrente) vira unhandledRejection e o Node 22 derruba o processo da API.
    void this.runSync()
      .catch((error: unknown) => {
        this.logger.error(
          'Falha inesperada na sincronizacao com o ERP.',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        this.isScheduledSyncRunning = false;
      });
  }

  async onModuleDestroy(): Promise<void> {
    const pool = this.pool;
    this.pool = null;
    await pool?.end();
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
      await this.reconcileCancelledRecovery();
      this.logger.warn(
        'Nenhum evento valido apos validacao — rodada encerrada.',
      );
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
    await this.reconcileCancelledRecovery();
  }

  /**
   * Clientes cancelados devolvidos à carteira (CANCELLED_IN_RECOVERY): só viram
   * RECOVERED quando o ERP mostra o contrato "Normal" de novo E houve contato
   * efetivo com observação antes da reativação; sem isso, REACTIVATED (sem
   * receita). A receita do atendente é o que o cliente PAGAR depois da
   * reativação (recalculado a cada rodada durante a janela de pagamentos).
   */
  private async reconcileCancelledRecovery(): Promise<void> {
    const config = getErpSyncConfig();

    if (!config.db) {
      return;
    }

    const now = new Date();
    const windowStart = new Date(
      now.getTime() -
        CANCELLED_RECOVERY_PAYMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const cases = await this.prisma.collectionCase.findMany({
      where: {
        OR: [
          { status: CollectionStatus.CANCELLED_IN_RECOVERY },
          {
            status: CollectionStatus.RECOVERED,
            reactivatedAt: { not: null, gte: windowStart },
          },
        ],
        contract: { externalId: { not: null } },
      },
      select: {
        id: true,
        status: true,
        cycleStartedAt: true,
        reactivatedAt: true,
        recoveredAmount: true,
        contractId: true,
        contract: { select: { externalId: true } },
        collectionAttempts: {
          where: { isAutomatic: false },
          select: {
            attemptedAt: true,
            result: true,
            notes: true,
            isAutomatic: true,
          },
        },
      },
    });

    if (cases.length === 0) {
      return;
    }

    const contractExternalIds = [
      ...new Set(
        cases
          .map((item) => item.contract.externalId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const erpState = new Map<string, CancelledRecoveryErpState>();

    try {
      const pool = this.getPool(config.db);
      const result = await pool.query<CancelledRecoveryStateRow>(
        CANCELLED_RECOVERY_STATE_QUERY,
        [contractExternalIds],
      );

      for (const row of result.rows) {
        erpState.set(row.contract_external_id, {
          erpContractStatus: row.erp_contract_status,
          reactivatedAt: row.reactivated_at
            ? new Date(row.reactivated_at)
            : null,
        });
      }
    } catch (error) {
      this.logger.error(
        'Falha ao ler a reativacao dos cancelados no ERP. Reconciliacao de cancelados abortada nesta rodada.',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    type Transition = {
      caseId: string;
      contractId: string;
      kind: 'recovered' | 'reactivated';
      reactivatedAt: Date;
    };
    const transitions: Transition[] = [];

    for (const item of cases) {
      if (item.status !== CollectionStatus.CANCELLED_IN_RECOVERY) {
        continue;
      }

      const outcome = resolveCancelledRecoveryOutcome({
        erp: erpState.get(item.contract.externalId ?? ''),
        cycleStartedAt: item.cycleStartedAt,
        attempts: item.collectionAttempts,
        now,
      });

      if (outcome.kind !== 'waiting') {
        transitions.push({
          caseId: item.id,
          contractId: item.contractId,
          kind: outcome.kind,
          reactivatedAt: outcome.reactivatedAt,
        });
      }
    }

    if (transitions.length > 0) {
      await retryOnWriteConflict(() =>
        this.prisma.$transaction(async (tx) => {
          for (const transition of transitions) {
            const recovered = transition.kind === 'recovered';
            const nextStatus = recovered
              ? CollectionStatus.RECOVERED
              : CollectionStatus.REACTIVATED;

            await tx.collectionCase.update({
              where: { id: transition.caseId },
              data: {
                status: nextStatus,
                reactivatedAt: transition.reactivatedAt,
                recoveredAt: recovered ? transition.reactivatedAt : null,
                // Receita = pagamentos após a reativação (atualizada abaixo).
                recoveredAmount: recovered ? '0.00' : null,
                outstandingAmount: 0,
                daysOverdue: 0,
                updatedAt: now,
              },
            });

            await tx.contract.update({
              where: { id: transition.contractId },
              data: {
                status: ContractStatus.ACTIVE,
                erpStatus: 'Normal',
                updatedAt: now,
              },
            });

            await tx.auditLog.create({
              data: {
                entityType: 'COLLECTION_CASE',
                entityId: transition.caseId,
                action: AuditAction.STATUS_CHANGE,
                beforeSnapshot: {
                  status: CollectionStatus.CANCELLED_IN_RECOVERY,
                },
                afterSnapshot: {
                  status: nextStatus,
                  reactivatedAt: transition.reactivatedAt.toISOString(),
                },
                metadata: {
                  resourceType: 'COLLECTION_CASE',
                  action: recovered
                    ? 'CANCELLED_RECOVERY_RECOVERED'
                    : 'CANCELLED_RECOVERY_REACTIVATED',
                  source: ERP_SYNC_SOURCE,
                  reason: recovered
                    ? 'Contrato reativado no ERP com contato efetivo e observacao registrados antes da reativacao.'
                    : 'Contrato reativado no ERP sem contato qualificado antes (nao credita receita).',
                },
              },
            });
          }
        }),
      );

      this.logger.log(
        `Cancelados reativados: ${transitions.filter((item) => item.kind === 'recovered').length} recuperado(s), ${transitions.filter((item) => item.kind === 'reactivated').length} sem credito.`,
      );
    }

    await this.refreshCancelledRecoveryRevenue(
      config.db,
      cases,
      transitions,
      now,
    );
  }

  // Receita dos recuperados = soma do que foi pago desde a reativação.
  private async refreshCancelledRecoveryRevenue(
    db: NonNullable<ReturnType<typeof getErpSyncConfig>['db']>,
    cases: Array<{
      id: string;
      status: CollectionStatus;
      reactivatedAt: Date | null;
      recoveredAmount: { toString(): string } | null;
      contract: { externalId: string | null };
    }>,
    transitions: Array<{
      caseId: string;
      kind: 'recovered' | 'reactivated';
      reactivatedAt: Date;
    }>,
    now: Date,
  ): Promise<void> {
    const recoveredNow = new Map(
      transitions
        .filter((transition) => transition.kind === 'recovered')
        .map((transition) => [transition.caseId, transition.reactivatedAt]),
    );

    const targets = cases
      .map((item) => ({
        id: item.id,
        externalId: item.contract.externalId,
        since:
          recoveredNow.get(item.id) ??
          (item.status === CollectionStatus.RECOVERED
            ? item.reactivatedAt
            : null),
        current: Number(item.recoveredAmount?.toString() ?? '0'),
      }))
      .filter(
        (
          target,
        ): target is typeof target & { externalId: string; since: Date } =>
          target.externalId !== null && target.since !== null,
      );

    if (targets.length === 0) {
      return;
    }

    let paidByContract: Map<string, number>;

    try {
      const pool = this.getPool(db);
      const result = await pool.query<CancelledRecoveryPaidRow>(
        CANCELLED_RECOVERY_PAID_SINCE_QUERY,
        [
          targets.map((target) => target.externalId),
          targets.map((target) => target.since.toISOString().slice(0, 10)),
        ],
      );
      paidByContract = new Map(
        result.rows.map((row) => [
          row.contract_external_id,
          Number(row.paid_amount),
        ]),
      );
    } catch (error) {
      this.logger.error(
        'Falha ao ler os pagamentos dos cancelados recuperados no ERP. Receita nao atualizada nesta rodada.',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    for (const target of targets) {
      const paid = paidByContract.get(target.externalId) ?? 0;

      if (Math.abs(paid - target.current) < 0.005) {
        continue;
      }

      await this.prisma.collectionCase.update({
        where: { id: target.id },
        data: { recoveredAmount: paid.toFixed(2), updatedAt: now },
      });
    }
  }

  private async reconcileRecoveredCases(): Promise<void> {
    const activeSyncedCases = await this.prisma.collectionCase.findMany({
      where: {
        externalId: { not: null },
        // Exclui TODOS os finalizados — inclusive RENEGOTIATED. Sem isso, um
        // caso renegociado (finalizado) era reprocessado a cada rodada e
        // re-marcado como renegociado, gerando auditoria duplicada e contagem
        // falsa. Ele so volta a ser avaliado se reabrir (ingest).
        status: {
          notIn: [
            CollectionStatus.CLOSED,
            CollectionStatus.RECOVERED,
            CollectionStatus.PAYMENT_MADE,
            CollectionStatus.RENEGOTIATED,
            // Cancelados devolvidos à carteira têm reconciliação própria
            // (reconcileCancelledRecovery); aqui virariam "cancelados" de novo.
            CollectionStatus.CANCELLED_IN_RECOVERY,
            CollectionStatus.REACTIVATED,
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
          contractErpStatus: openTitles[0]?.erp_contract_status ?? null,
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
          contractErpStatus: string | null;
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
      .filter((externalId): externalId is string =>
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
            cancellationReason: row.cancellation_reason ?? null,
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

    // EVIDENCIA DE PAGAMENTO (anti falso positivo de receita): so conta como
    // recuperado/pago quem teve PAGAMENTO REAL (client_paid_date) em algum dos
    // titulos-gatilho do caso. Sem isso, um titulo com vencimento adiado ou
    // apagado "sai da regra" sem ter sido pago e seria contado como receita
    // falsa. As faturas-gatilho ficam guardadas na plataforma (invoice.externalId
    // = id do titulo no ERP).
    const recoverContractIds = [
      ...new Set(
        casesToRecover.map((collectionCase) => collectionCase.contractId),
      ),
    ];
    const triggerInvoices =
      recoverContractIds.length > 0
        ? await this.prisma.invoice.findMany({
            where: {
              contractId: { in: recoverContractIds },
              externalId: { not: null },
            },
            select: { contractId: true, externalId: true },
          })
        : [];

    const titleIdsByContract = new Map<string, string[]>();
    for (const invoice of triggerInvoices) {
      const externalId = invoice.externalId;
      if (!externalId || !/^[0-9]+$/.test(externalId)) {
        continue;
      }
      const bucket = titleIdsByContract.get(invoice.contractId);
      if (bucket) {
        bucket.push(externalId);
      } else {
        titleIdsByContract.set(invoice.contractId, [externalId]);
      }
    }

    const allTriggerTitleIds = [
      ...new Set(Array.from(titleIdsByContract.values()).flat()),
    ];

    const paidTitleIds = new Set<string>();
    // Data da baixa (client_paid_date) por título pago — usado p/ a Fase 2 do
    // crédito de recuperação (contato efetivo tem de ser até o dia do pagamento).
    const paidDateByTitle = new Map<string, Date>();
    if (allTriggerTitleIds.length > 0) {
      try {
        const pool = this.getPool(config.db);
        const paidResult = await pool.query<{ id: string; paid_date: Date }>(
          PAID_TITLES_QUERY,
          [allTriggerTitleIds],
        );
        for (const row of paidResult.rows) {
          paidTitleIds.add(row.id);
          if (row.paid_date) {
            paidDateByTitle.set(row.id, new Date(row.paid_date));
          }
        }
      } catch (error) {
        this.logger.error(
          'Falha ao confirmar pagamento dos titulos no ERP. Reconciliacao abortada nesta rodada (nao credita recuperacao sem prova).',
          error instanceof Error ? error.stack : String(error),
        );
        return;
      }
    }

    const hasPaymentEvidence = (collectionCase: { contractId: string }) => {
      const ids = titleIdsByContract.get(collectionCase.contractId);
      return Boolean(ids && ids.some((id) => paidTitleIds.has(id)));
    };

    // Desfecho por caso (função pura testável). PAGO exige regularização E prova
    // de pagamento real; sem isso vira "unresolved" (não conta como receita).
    const outcomeByCase = new Map<string, ReconcileOutcome>();
    for (const collectionCase of casesToRecover) {
      outcomeByCase.set(
        collectionCase.id,
        resolveReconcileOutcome(
          statusFor(collectionCase),
          hasPaymentEvidence(collectionCase),
        ),
      );
    }

    const paidCases = casesToRecover.filter(
      (collectionCase) => outcomeByCase.get(collectionCase.id) === 'paid',
    );
    const cancelledCases = casesToRecover.filter(
      (collectionCase) => outcomeByCase.get(collectionCase.id) === 'cancelled',
    );
    const unresolvedCases = casesToRecover.filter(
      (collectionCase) => outcomeByCase.get(collectionCase.id) === 'unresolved',
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

    await retryOnWriteConflict(
      () =>
        this.prisma.$transaction(
          async (tx) => {
            for (const collectionCase of casesToRefresh) {
              await tx.contract.update({
                where: { id: collectionCase.contractId },
                data: {
                  status: collectionCase.contractStatus,
                  erpStatus: collectionCase.contractErpStatus ?? undefined,
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
              const reconcileStatus = collectionCase.externalId
                ? contractStatusByExternalId.get(collectionCase.externalId)
                : undefined;
              const erpStatus = reconcileStatus?.erpContractStatus ?? null;

              if (erpStatus) {
                const isCancelled =
                  mapContractStatus(erpStatus) === 'CANCELLED';
                await tx.contract.update({
                  where: { id: collectionCase.contractId },
                  data: {
                    status: mapContractStatus(erpStatus),
                    erpStatus,
                    // Guarda o motivo só quando cancelado; limpa ao reativar.
                    cancellationReason: isCancelled
                      ? (reconcileStatus?.cancellationReason ?? null)
                      : null,
                    updatedAt: now,
                  },
                });
              }
            }

            // Marca como PAGA SOMENTE as faturas cujos titulos foram de fato pagos no
            // ERP (externalId em paidTitleIds). Antes marcava TODAS as faturas em
            // aberto do contrato — inclusive mensalidades futuras nao pagas —, o que
            // inflava a receita recuperada. Agora reflete so o que foi efetivamente
            // quitado.
            const invoicesToMarkAsPaid =
              paidTitleIds.size > 0
                ? await tx.invoice.findMany({
                    where: {
                      contractId: { in: contractIds },
                      externalId: { in: [...paidTitleIds] },
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
                  })
                : [];

            for (const invoice of invoicesToMarkAsPaid) {
              await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                  status: InvoiceStatus.PAID,
                  paidAmount: invoice.amount,
                },
              });
            }

            // Valor efetivamente pago por contrato = soma dos títulos-gatilho pagos
            // no ERP (inclui os que já tinham sido baixados antes). É a receita que
            // o ranking credita: o saldo em aberto é zerado ao recuperar.
            const paidInvoices =
              paidTitleIds.size > 0
                ? await tx.invoice.findMany({
                    where: {
                      contractId: { in: contractIds },
                      externalId: { in: [...paidTitleIds] },
                      status: InvoiceStatus.PAID,
                    },
                    select: { contractId: true, amount: true },
                  })
                : [];
            const paidCentsByContract = new Map<string, number>();
            for (const invoice of paidInvoices) {
              paidCentsByContract.set(
                invoice.contractId,
                (paidCentsByContract.get(invoice.contractId) ?? 0) +
                  Math.round(Number(invoice.amount.toString()) * 100),
              );
            }
            const contractIdByCase = new Map(
              paidCases.map((collectionCase) => [
                collectionCase.id,
                collectionCase.contractId,
              ]),
            );
            const paidAmountFor = (caseId: string) => {
              const contractId = contractIdByCase.get(caseId);
              const cents = contractId
                ? (paidCentsByContract.get(contractId) ?? 0)
                : 0;
              return (cents / 100).toFixed(2);
            };

            // Distingue quem foi RECUPERADO por um atendente (teve pelo menos 1
            // tentativa manual antes de pagar) de quem so PAGOU sem atendimento
            // (PAYMENT_MADE). Assim a supervisao/ranking nao credita ao atendente um
            // pagamento espontaneo.
            const manualAttempts = await tx.collectionAttempt.findMany({
              where: { collectionCaseId: { in: caseIds }, isAutomatic: false },
              select: {
                collectionCaseId: true,
                attemptedAt: true,
                result: true,
              },
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
            // Data da baixa por caso = menor client_paid_date entre os títulos-gatilho
            // pagos do contrato. Usada p/ exigir que o contato efetivo seja até o dia
            // do pagamento (Fase 2) — senão o crédito vai pra quem ligou DEPOIS de o
            // cliente já ter pago sozinho.
            const paymentDayByCase = new Map<string, Date | null>(
              paidCases.map((collectionCase) => {
                const titleIds = titleIdsByContract.get(
                  collectionCase.contractId,
                );
                let earliest: Date | null = null;
                for (const titleId of titleIds ?? []) {
                  const paidDate = paidDateByTitle.get(titleId);
                  if (
                    paidDate &&
                    (!earliest || paidDate.getTime() < earliest.getTime())
                  ) {
                    earliest = paidDate;
                  }
                }
                return [collectionCase.id, earliest];
              }),
            );
            const recoveredIds = resolveRecoveredCaseIds(
              manualAttempts,
              cycleStartByCase,
              paymentDayByCase,
            );
            const recoveredCaseIds = caseIds.filter((id) =>
              recoveredIds.has(id),
            );
            const paidCaseIds = caseIds.filter((id) => !recoveredIds.has(id));

            // Um update por caso: cada um grava o valor pago do próprio contrato.
            for (const caseId of recoveredCaseIds) {
              await tx.collectionCase.update({
                where: { id: caseId },
                data: {
                  status: CollectionStatus.RECOVERED,
                  recoveredAt: now,
                  recoveredAmount: paidAmountFor(caseId),
                  outstandingAmount: 0,
                  daysOverdue: 0,
                  updatedAt: now,
                },
              });
            }

            for (const caseId of paidCaseIds) {
              await tx.collectionCase.update({
                where: { id: caseId },
                data: {
                  status: CollectionStatus.PAYMENT_MADE,
                  recoveredAt: now,
                  recoveredAmount: paidAmountFor(caseId),
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
                    outstandingAmount:
                      collectionCase.outstandingAmount.toString(),
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
                    reason:
                      'Contrato nao retornou mais na regra de elegibilidade do ERP.',
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
                      outstandingAmount:
                        collectionCase.outstandingAmount.toString(),
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

            await tx.integrationEvent.create({
              data: {
                source: ERP_SYNC_SOURCE,
                eventType: 'collection_cases.reconcile_recovered',
                status: IntegrationEventStatus.COMPLETED,
                payload: {
                  recoveredCases: paidCases.length,
                  cancelledCases: cancelledCases.length,
                  unresolvedCases: unresolvedCases.length,
                  unresolvedExternalIds: unresolvedCases.map(
                    (collectionCase) => collectionCase.externalId,
                  ),
                  refreshedCases: casesToRefresh.length,
                  refreshedContracts: casesToRefresh.length,
                  checkedCases: syncedCases.length,
                  openTitles: openTitleRows.length,
                  recoveredExternalIds: paidCases.map(
                    (collectionCase) => collectionCase.externalId,
                  ),
                  cancelledExternalIds: cancelledCases.map(
                    (collectionCase) => collectionCase.externalId,
                  ),
                },
                processedAt: now,
              },
            });
          },
          {
            maxWait: 10_000,
            timeout: 120_000,
          },
        ),
      {
        onRetry: (attempt) =>
          this.logger.warn(
            `Reconciliacao ERP: conflito de escrita (tentativa ${attempt}); repetindo a transacao.`,
          ),
      },
    );

    this.logger.log(
      `Reconciliacao ERP concluida: ${paidCases.length} recuperado(s), ${cancelledCases.length} cancelado(s), ${unresolvedCases.length} sem pagamento (nao finalizado).`,
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
          entityType: supervisorSummary.entityId
            ? 'COLLECTION_CASE'
            : undefined,
          entityId: supervisorSummary.entityId ?? undefined,
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
          entityType: supervisorSummary.entityId
            ? 'COLLECTION_CASE'
            : undefined,
          entityId: supervisorSummary.entityId ?? undefined,
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

  private renegotiationSummaryCache: {
    at: number;
    value: RenegotiationSummaryResponse;
  } | null = null;

  /**
   * Renegociacoes em aberto para o card do dashboard: reaproveita a consulta da
   * aba Renegociados (fonte unica), com cache de 5 min e timeout de 10 s para
   * nao deixar o dashboard lento. Se o ERP falhar devolve o ultimo valor em
   * cache (se houver) ou available=false — nunca um 0 falso.
   */
  async getRenegotiationSummary(): Promise<RenegotiationSummaryResponse> {
    const cached = this.renegotiationSummaryCache;
    if (cached && Date.now() - cached.at < RENEGOTIATION_SUMMARY_TTL_MS) {
      return cached.value;
    }

    try {
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Timeout ao consultar renegociacoes.')),
          RENEGOTIATION_SUMMARY_TIMEOUT_MS,
        );
      });
      const history = await Promise.race([
        this.getRenegotiationHistory({ strict: true }),
        timeout,
      ]).finally(() => clearTimeout(timer));

      const value: RenegotiationSummaryResponse = {
        available: true,
        count: history.summary.currentlyRenegotiated,
        openAmount: history.summary.openRenegotiationTotal,
      };
      this.renegotiationSummaryCache = { at: Date.now(), value };

      return value;
    } catch (error) {
      this.logger.warn(
        `Resumo de renegociacoes indisponivel: ${error instanceof Error ? error.message : String(error)}`,
      );

      return (
        cached?.value ?? { available: false, count: 0, openAmount: '0.00' }
      );
    }
  }

  // Relatorio historico de renegociacoes: clientes da nossa carteira que
  // renegociaram alguma vez no ERP (fonte financial_renegotiations), com nº de
  // vezes e datas. Fonte CORRETA — diferente do flag `renegotiated` do titulo,
  // que marca titulos substituidos em renegociacoes antigas (resquicio).
  // `strict`: em vez de devolver um resumo vazio quando o ERP falha, lanca o
  // erro (para o resumo do dashboard distinguir "indisponivel" de "0").
  async getRenegotiationHistory(
    options: { strict?: boolean } = {},
  ): Promise<RenegotiatedHistoryResponse> {
    const emptySummary = {
      totalCases: 0,
      totalRenegotiations: 0,
      currentlyRenegotiated: 0,
      openRenegotiationTotal: '0.00',
      totalOutstanding: '0.00',
    };

    const cases = await this.prisma.collectionCase.findMany({
      where: { externalId: { not: null } },
      select: { externalId: true },
    });
    const ids = cases
      .map((c) => c.externalId)
      .filter((x): x is string => Boolean(x && UUID_PATTERN.test(x)));

    const config = getErpSyncConfig();
    if (!config.db) {
      if (options.strict) {
        throw new Error('ERP nao configurado.');
      }
      return { items: [], summary: emptySummary };
    }
    if (ids.length === 0) {
      return { items: [], summary: emptySummary };
    }

    let rows: Array<{
      pid: string;
      reneg_count: string | number;
      first_date: Date;
      last_date: Date;
      open_reneg_balance: string | number | null;
    }>;
    try {
      const pool = this.getPool(config.db);
      const result = await pool.query<(typeof rows)[number]>(
        RENEGOTIATION_HISTORY_QUERY,
        [ids],
      );
      rows = result.rows;
    } catch (error) {
      this.logger.error(
        'Falha ao buscar historico de renegociacoes no ERP.',
        error instanceof Error ? error.stack : String(error),
      );
      if (options.strict) {
        throw error;
      }
      return { items: [], summary: emptySummary };
    }

    const byPid = new Map(
      rows.map((r) => [
        r.pid,
        {
          count: Number(r.reneg_count),
          first: r.first_date,
          last: r.last_date,
          openBalance: Number(r.open_reneg_balance ?? 0),
        },
      ]),
    );
    const renegotiatedIds = [...byPid.keys()];
    if (renegotiatedIds.length === 0) {
      return { items: [], summary: emptySummary };
    }

    const detailedCases = await this.prisma.collectionCase.findMany({
      where: { externalId: { in: renegotiatedIds } },
      select: {
        id: true,
        externalId: true,
        status: true,
        outstandingAmount: true,
        customer: { select: { name: true, document: true } },
        contract: { select: { code: true, externalId: true } },
        assignedUser: { select: { name: true } },
      },
    });

    const items: RenegotiatedHistoryItem[] = detailedCases.map(
      (collectionCase) => {
        const aggregate = collectionCase.externalId
          ? byPid.get(collectionCase.externalId)
          : undefined;
        return {
          caseId: collectionCase.id,
          customerName: collectionCase.customer?.name ?? '—',
          customerDocument: collectionCase.customer?.document ?? '',
          contractCode: collectionCase.contract?.code ?? null,
          contractExternalId: collectionCase.contract?.externalId ?? null,
          renegotiationCount: aggregate?.count ?? 0,
          firstRenegotiatedAt: (aggregate?.first ?? new Date()).toISOString(),
          lastRenegotiatedAt: (aggregate?.last ?? new Date()).toISOString(),
          currentStatus: collectionCase.status,
          isCurrentlyRenegotiated: (aggregate?.openBalance ?? 0) > 0,
          openRenegotiationAmount: (aggregate?.openBalance ?? 0).toFixed(2),
          outstandingAmount: Number(collectionCase.outstandingAmount).toFixed(
            2,
          ),
          assignedToName: collectionCase.assignedUser?.name ?? null,
        };
      },
    );

    items.sort((a, b) =>
      b.lastRenegotiatedAt.localeCompare(a.lastRenegotiatedAt),
    );

    const totalOutstanding = detailedCases
      .reduce((total, c) => total + Number(c.outstandingAmount ?? 0), 0)
      .toFixed(2);
    const openRenegotiationTotal = items
      .reduce((total, item) => total + Number(item.openRenegotiationAmount), 0)
      .toFixed(2);

    return {
      items,
      summary: {
        totalCases: items.length,
        totalRenegotiations: items.reduce(
          (total, item) => total + item.renegotiationCount,
          0,
        ),
        currentlyRenegotiated: items.filter(
          (item) => item.isCurrentlyRenegotiated,
        ).length,
        openRenegotiationTotal,
        totalOutstanding,
      },
    };
  }

  // Busca AO VIVO no ERP os titulos renegociados e o saldo em aberto de um
  // contrato (sem o filtro renegotiated=false). Usado pela aba Renegociados.
  async getRenegotiationDetail(
    contractExternalId: string,
  ): Promise<RenegotiationDetailResponse> {
    const empty: RenegotiationDetailResponse = {
      available: false,
      renegotiatedTitles: [],
      openTitles: [],
      openBalanceTotal: '0.00',
    };

    if (!UUID_PATTERN.test(contractExternalId)) {
      return empty;
    }

    const config = getErpSyncConfig();
    if (!config.db) {
      return empty;
    }

    let rows: RenegotiationDetailRow[];
    try {
      const pool = this.getPool(config.db);
      const result = await pool.query<RenegotiationDetailRow>(
        RENEGOTIATION_DETAIL_QUERY,
        [contractExternalId],
      );
      rows = result.rows;
    } catch (error) {
      this.logger.error(
        'Falha ao buscar detalhe de renegociacao no ERP.',
        error instanceof Error ? error.stack : String(error),
      );
      return empty;
    }

    const toTitle = (row: RenegotiationDetailRow): RenegotiationTitle => ({
      invoiceNumber: row.invoice_number,
      nature: row.nature,
      renegotiated: row.was_consumed === true,
      paid: row.paid === true,
      titleAmount: Number(row.title_amount ?? 0).toFixed(2),
      balance: Number(row.balance ?? 0).toFixed(2),
      expiration: row.expiration
        ? row.expiration.toISOString().slice(0, 10)
        : null,
    });

    // Títulos RENEGOCIADOS = os que foram CONSUMIDOS numa renegociação (type=0).
    // Em aberto = os GERADOS (type=1) que NÃO foram consumidos depois e ainda têm
    // saldo sem baixa real — é o que o cliente de fato ainda deve. (Um título
    // gerado e depois renegociado de novo entra só em "renegociados".)
    const renegotiatedTitles = rows
      .filter((row) => row.was_consumed === true)
      .map(toTitle);
    const openTitles = rows
      .filter(
        (row) =>
          row.was_generated === true &&
          row.was_consumed !== true &&
          row.paid !== true &&
          Number(row.balance ?? 0) > 0,
      )
      .map(toTitle);
    const openBalanceTotal = openTitles
      .reduce((total, title) => total + Number(title.balance), 0)
      .toFixed(2);

    return {
      available: true,
      renegotiatedTitles,
      openTitles,
      openBalanceTotal,
    };
  }

  private getPool(db: ErpSyncDbConfig): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        host: db.host,
        port: db.port,
        database: db.database,
        user: db.user,
        password: db.password,
        max: 2,
        ssl: false,
      });
      // Conexao ociosa derrubada pelo ERP emite 'error' no pool; sem listener o Node encerra o processo.
      this.pool.on('error', (error: Error) => {
        this.logger.error(
          `Conexao ociosa do pool do ERP falhou: ${error.message}`,
        );
      });
    }

    return this.pool;
  }
}
