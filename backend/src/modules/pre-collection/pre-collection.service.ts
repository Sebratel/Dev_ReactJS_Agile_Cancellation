import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { createApiResponse } from '@/common/responses/api-response';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { getErpSyncConfig, type ErpSyncDbConfig } from '@/config/erp-sync.config';
import type {
  PreCollectionItemResponse,
  PreCollectionListResponse,
} from '@/modules/pre-collection/dto/pre-collection-item.response';
import { PrismaService } from '@/database/prisma/prisma.service';

export type PreCollectionDistributeResult = {
  eligible: number;
  skipped: number;
  created: number;
  existing: number;
  distributed: number;
  agents: number;
};

const DEFAULT_DAYS_WINDOW = 7;
const MIN_DAYS_WINDOW = 1;
// Janela maxima suportada. O snapshot em cache e calculado com esta janela;
// janelas menores (3, 7) sao filtradas em memoria a partir dele.
const CACHE_WINDOW_DAYS = 15;

// Contratos com EXATAMENTE 1 titulo vencido e ao menos 1 prestes a vencer dentro
// da janela ($1 dias). Mesmos filtros da regra de elegibilidade da esteira
// (ver erp-sync.service.ts › ELIGIBILITY_QUERY) — muda apenas o criterio de datas.
// A varredura e limitada a [hoje-2meses, hoje+janela] para desempenho: contratos
// cujo unico vencido seja mais antigo que isso ficam de fora (raro — normalmente
// ja estariam com 2+ vencidos, ou seja, na esteira).
const PRE_COLLECTION_QUERY = `
WITH abertos AS (
  SELECT c.id AS contract_id,
         c.public_id::text        AS contract_external_id,
         c.contract_number::text  AS contract_number,
         p.name                    AS customer_name,
         p.tx_id                   AS document,
         p.phone                   AS phone,
         fr.expiration_date::date  AS venc,
         fr.balance::numeric       AS saldo
  FROM erp.financial_receivable_titles fr
  LEFT JOIN erp.financers_natures fn ON fn.id = fr.financer_nature_id
  LEFT JOIN erp.financial_receipt_titles x ON x.financial_receivable_title_id = fr.id
  JOIN erp.contracts c ON c.id = fr.contract_id
  JOIN erp.people p ON p.id = c.client_id
  LEFT JOIN erp.contract_types ct ON ct.id = c.contract_type_id
  WHERE fr.bill_title_id IS NULL
    AND fr.renegotiated IS false
    AND fr.deleted IS false
    AND x.client_paid_date IS NULL
    AND fn.title <> 'DF - TARIFA BAIXA DE TÍTULO'
    AND c.v_status IN ('Bloqueio Financeiro', 'Normal')
    AND ct.title NOT IN ('Sebratel - Fat. Especial')
    AND fr.expiration_date >= CURRENT_DATE - INTERVAL '2 months'
    AND fr.expiration_date <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
),
agg AS (
  SELECT contract_id,
         MAX(contract_external_id) AS contract_external_id,
         MAX(contract_number)      AS contract_number,
         MAX(customer_name)        AS customer_name,
         MAX(document)             AS document,
         MAX(phone)                AS phone,
         COUNT(*) FILTER (WHERE venc < CURRENT_DATE) AS vencidos,
         COUNT(*) FILTER (WHERE venc BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int * INTERVAL '1 day')) AS a_vencer,
         MIN(venc) FILTER (WHERE venc < CURRENT_DATE) AS first_overdue_date,
         SUM(saldo) FILTER (WHERE venc < CURRENT_DATE) AS first_overdue_amount,
         MIN(venc) FILTER (WHERE venc BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int * INTERVAL '1 day')) AS second_due_date,
         SUM(saldo) FILTER (WHERE venc BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int * INTERVAL '1 day')) AS second_due_amount
  FROM abertos
  GROUP BY contract_id
)
SELECT contract_external_id,
       contract_number,
       customer_name,
       document,
       phone,
       first_overdue_date,
       first_overdue_amount,
       second_due_date,
       second_due_amount
FROM agg
WHERE vencidos = 1 AND a_vencer >= 1
ORDER BY second_due_date ASC, customer_name ASC;
`;

type PreCollectionRow = {
  contract_external_id: string | null;
  contract_number: string | null;
  customer_name: string | null;
  document: string | null;
  phone: string | null;
  first_overdue_date: Date | string;
  first_overdue_amount: string | number;
  second_due_date: Date | string;
  second_due_amount: string | number | null;
};

// Normaliza a janela de dias (1..CACHE_WINDOW_DAYS; padrao 7). Ausente ou vazio
// cai no padrao (Number('') seria 0, o que nao e a intencao de "?daysWindow=").
export function normalizeDaysWindow(value: unknown): number {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return DEFAULT_DAYS_WINDOW;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DAYS_WINDOW;
  }
  return Math.min(
    CACHE_WINDOW_DAYS,
    Math.max(MIN_DAYS_WINDOW, Math.round(parsed)),
  );
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function toAmount(value: string | number | null): string {
  return Number(value ?? 0).toFixed(2);
}

function daysUntil(dateIso: string): number {
  const target = new Date(`${dateIso}T00:00:00.000Z`).getTime();
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.max(0, Math.round((target - todayUtc) / 86_400_000));
}

function mapRow(row: PreCollectionRow): PreCollectionItemResponse {
  const firstOverdueDate = toIsoDate(row.first_overdue_date);
  const secondDueDate = toIsoDate(row.second_due_date);
  const firstAmount = toAmount(row.first_overdue_amount);
  const secondAmount = toAmount(row.second_due_amount);

  return {
    contractExternalId: row.contract_external_id,
    contractCode: row.contract_number ?? '',
    customerName: row.customer_name?.trim() || 'Cliente',
    customerDocument: row.document?.trim() || null,
    customerPhone: row.phone?.trim() || null,
    firstOverdueDate,
    firstOverdueAmount: firstAmount,
    secondDueDate,
    secondDueAmount: secondAmount,
    daysUntilSecond: daysUntil(secondDueDate),
    totalOpenAmount: (Number(firstAmount) + Number(secondAmount)).toFixed(2),
  };
}

/**
 * A consulta ao ERP e cara (varre a tabela de titulos), entao servimos um
 * snapshot em cache atualizado em background — o endpoint responde na hora.
 */
const DISTRIBUTION_WINDOW_DAYS = 5;
const FINALIZED_STATUSES = ['CLOSED', 'RECOVERED', 'PAYMENT_MADE', 'RENEGOTIATED'];

@Injectable()
export class PreCollectionService implements OnModuleInit {
  private readonly logger = new Logger(PreCollectionService.name);
  private pool: Pool | null = null;
  private cache: { items: PreCollectionItemResponse[]; refreshedAt: string } | null =
    null;
  private refreshing = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // Primeiro carregamento em background (nao bloqueia o boot).
    void this.refreshCache();
  }

  @Cron('*/30 * * * *')
  handleScheduledRefresh(): void {
    void this.refreshCache();
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

  async refreshCache(): Promise<void> {
    if (this.refreshing) {
      return;
    }

    const config = getErpSyncConfig();
    if (!config.db || getDataSourceMode() !== 'database') {
      this.cache = { items: [], refreshedAt: new Date().toISOString() };
      return;
    }

    this.refreshing = true;
    try {
      const pool = this.getPool(config.db);
      const result = await pool.query<PreCollectionRow>(PRE_COLLECTION_QUERY, [
        CACHE_WINDOW_DAYS,
      ]);
      this.cache = {
        items: result.rows.map(mapRow),
        refreshedAt: new Date().toISOString(),
      };
      this.logger.log(
        `Snapshot pre-cobranca atualizado: ${result.rowCount} contrato(s).`,
      );
    } catch (error) {
      this.logger.error(
        'Falha ao atualizar snapshot de pre-cobranca no ERP.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.refreshing = false;
    }
  }

  list(daysWindowInput: unknown) {
    const daysWindow = normalizeDaysWindow(daysWindowInput);

    if (!this.cache) {
      // Cache ainda nao pronto — dispara o carregamento e responde "atualizando".
      void this.refreshCache();
      const response: PreCollectionListResponse = {
        daysWindow,
        generatedAt: null,
        refreshing: true,
        total: 0,
        items: [],
      };
      return createApiResponse(response);
    }

    // Janelas menores que a do cache sao filtradas em memoria.
    const items = this.cache.items.filter(
      (item) => item.daysUntilSecond <= daysWindow,
    );

    const response: PreCollectionListResponse = {
      daysWindow,
      generatedAt: this.cache.refreshedAt,
      refreshing: this.refreshing,
      total: items.length,
      items,
    };
    return createApiResponse(response);
  }

  async distribute(performedByUserId: string): Promise<PreCollectionDistributeResult> {
    if (!this.cache || getDataSourceMode() !== 'database') {
      return { eligible: 0, skipped: 0, created: 0, existing: 0, distributed: 0, agents: 0 };
    }

    const eligible = this.cache.items.filter(
      (item) => item.daysUntilSecond <= DISTRIBUTION_WINDOW_DAYS,
    );

    let skipped = 0;
    let created = 0;
    let existing = 0;

    for (const item of eligible) {
      if (!item.customerDocument) {
        skipped++;
        continue;
      }

      const customer = await this.prisma.customer.upsert({
        where: { document: item.customerDocument },
        update: { name: item.customerName, phone: item.customerPhone ?? undefined },
        create: {
          name: item.customerName,
          document: item.customerDocument,
          phone: item.customerPhone ?? undefined,
        },
      });

      const contract = await this.prisma.contract.upsert({
        where: { code: item.contractCode },
        update: { externalId: item.contractExternalId ?? undefined },
        create: {
          customerId: customer.id,
          code: item.contractCode,
          externalId: item.contractExternalId ?? undefined,
          startDate: new Date(item.firstOverdueDate),
          status: 'ACTIVE',
        },
      });

      const existingCase = await this.prisma.collectionCase.findFirst({
        where: {
          contractId: contract.id,
          status: { notIn: FINALIZED_STATUSES as any },
        },
        select: { id: true },
      });

      if (existingCase) {
        existing++;
        continue;
      }

      const overdueMs = Date.now() - new Date(item.firstOverdueDate).getTime();
      await this.prisma.collectionCase.create({
        data: {
          contractId: contract.id,
          customerId: customer.id,
          status: 'WAITING_TRIAGE',
          priority: 'LOW',
          outstandingAmount: Number(item.totalOpenAmount),
          daysOverdue: Math.max(0, Math.round(overdueMs / 86_400_000)),
          cycleStartedAt: new Date(),
        },
      });

      created++;
    }

    // Distribui TODOS os casos WAITING_TRIAGE sem responsável (incluindo os criados agora).
    const unassigned = await this.prisma.collectionCase.findMany({
      where: { status: 'WAITING_TRIAGE', assignedUserId: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const agents = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userRoles: { some: { role: { code: 'COLLECTION_AGENT' } } },
      },
      select: { id: true },
      orderBy: { name: 'asc' },
    });

    if (unassigned.length === 0 || agents.length === 0) {
      return { eligible: eligible.length, skipped, created, existing, distributed: 0, agents: agents.length };
    }

    const now = new Date();
    const assignments = unassigned.map((c, i) => ({
      caseId: c.id,
      agentId: agents[i % agents.length]!.id,
    }));

    const byAgent = new Map<string, string[]>();
    for (const { caseId, agentId } of assignments) {
      const list = byAgent.get(agentId) ?? [];
      list.push(caseId);
      byAgent.set(agentId, list);
    }

    await this.prisma.$transaction(
      Array.from(byAgent.entries()).map(([agentId, ids]) =>
        this.prisma.collectionCase.updateMany({
          where: { id: { in: ids } },
          data: { assignedUserId: agentId, assignedAt: now, updatedAt: now },
        }),
      ),
    );

    this.logger.log(
      `Pre-cobranca: ${created} casos criados, ${assignments.length} distribuídos entre ${agents.length} agentes.`,
    );

    return {
      eligible: eligible.length,
      skipped,
      created,
      existing,
      distributed: assignments.length,
      agents: agents.length,
    };
  }
}
