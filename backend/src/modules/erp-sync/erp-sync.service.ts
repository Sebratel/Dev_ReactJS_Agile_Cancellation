import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AuditAction,
  CancellationStatus,
  CollectionStatus,
  IntegrationEventStatus,
  InvoiceStatus,
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

@Injectable()
export class ErpSyncService {
  private readonly logger = new Logger(ErpSyncService.name);
  private pool: Pool | null = null;

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('*/30 * * * *')
  handleScheduledSync(): void {
    void this.runSync();
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
          notIn: [CollectionStatus.CLOSED, CollectionStatus.RECOVERED],
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

    const caseIds = casesToRecover.map((collectionCase) => collectionCase.id);
    const contractIds = [
      ...new Set(casesToRecover.map((collectionCase) => collectionCase.contractId)),
    ];
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

      await tx.collectionCase.updateMany({
        where: { id: { in: caseIds } },
        data: {
          status: CollectionStatus.RECOVERED,
          recoveredAt: now,
          outstandingAmount: 0,
          daysOverdue: 0,
          updatedAt: now,
        },
      });

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

      for (const collectionCase of casesToRecover) {
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
              status: CollectionStatus.RECOVERED,
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

      await tx.integrationEvent.create({
        data: {
          source: ERP_SYNC_SOURCE,
          eventType: 'collection_cases.reconcile_recovered',
          status: IntegrationEventStatus.COMPLETED,
          payload: {
            recoveredCases: casesToRecover.length,
            refreshedCases: casesToRefresh.length,
            refreshedContracts: casesToRefresh.length,
            checkedCases: syncedCases.length,
            openTitles: openTitleRows.length,
            recoveredExternalIds: casesToRecover.map(
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
      `Reconciliacao ERP concluida: ${casesToRecover.length} caso(s) marcado(s) como recuperado(s).`,
    );
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
