import {
  CollectionStatus,
  ContractStatus,
  InvoiceStatus,
  Priority,
} from '@prisma/client';
import type { IngestCollectionCasesDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';

export const ERP_SYNC_SOURCE = 'erp-sync';

/**
 * Formato de uma linha (contrato + titulo em aberto) retornada pela query de
 * elegibilidade do ERP. Uma linha por titulo — um contrato com 2 titulos em
 * aberto aparece em 2 linhas, agrupadas aqui por `erp_contract_id`.
 */
export type ErpEligibleRow = {
  erp_client_id: string;
  document: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  erp_contract_id: string;
  contract_external_id: string;
  contract_number: string;
  erp_contract_status: string | null;
  contract_date: Date;
  contract_monthly_amount: string | null;
  plan_title: string | null;
  title_external_id: string;
  invoice_number: string | null;
  title_amount: string;
  outstanding_amount: string;
  expiration_date: Date;
};

export type MapErpRowsResult = {
  payload: IngestCollectionCasesDto;
  skippedContracts: number;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const HIGH_PRIORITY_THRESHOLD_DAYS = 60;

function groupByContract(
  rows: ErpEligibleRow[],
): Map<string, ErpEligibleRow[]> {
  const groups = new Map<string, ErpEligibleRow[]>();

  for (const row of rows) {
    const bucket = groups.get(row.erp_contract_id);

    if (bucket) {
      bucket.push(row);
    } else {
      groups.set(row.erp_contract_id, [row]);
    }
  }

  return groups;
}

/**
 * Normaliza valores opcionais vindos do ERP: string vazia/so espaco vira
 * undefined (o Postgres guarda "" em vez de NULL em vários campos), evitando
 * falhas de validacao como @IsEmail() recebendo string vazia.
 */
function toOptionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isOverdue(title: ErpEligibleRow, now: Date): boolean {
  return title.expiration_date.getTime() < now.getTime();
}

function calculateDaysOverdue(titles: ErpEligibleRow[], now: Date): number {
  const oldestExpiration = titles.reduce<Date | null>((oldest, title) => {
    if (!oldest || title.expiration_date < oldest) {
      return title.expiration_date;
    }
    return oldest;
  }, null);

  if (!oldestExpiration) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((now.getTime() - oldestExpiration.getTime()) / MS_PER_DAY),
  );
}

export function mapContractStatus(
  status: string | null | undefined,
): ContractStatus {
  if (status === 'Bloqueio Financeiro') {
    return ContractStatus.SUSPENDED;
  }

  return ContractStatus.ACTIVE;
}

/**
 * Agrupa as linhas retornadas pela query de elegibilidade do ERP por
 * contrato e monta o payload no formato aceito por
 * WebhooksService.ingestCollectionCases (customer/contract/invoices/case).
 * Contratos sem documento (CPF/CNPJ) no ERP sao descartados individualmente
 * — nao bloqueiam o restante do lote, ja que o documento e obrigatorio no
 * nosso schema.
 */
export function mapErpRowsToIngestPayload(
  rows: ErpEligibleRow[],
  now: Date = new Date(),
): MapErpRowsResult {
  const groups = groupByContract(rows);
  const events: IngestCollectionCasesDto['events'] = [];
  let skippedContracts = 0;

  for (const titles of groups.values()) {
    const [first] = titles;

    const document = toOptionalString(first?.document);

    if (!first || !document) {
      skippedContracts += 1;
      continue;
    }

    const overdueTitles = titles.filter((title) => isOverdue(title, now));

    if (overdueTitles.length === 0) {
      skippedContracts += 1;
      continue;
    }

    const outstandingAmount = overdueTitles.reduce(
      (total, title) => total + Number(title.outstanding_amount),
      0,
    );
    const daysOverdue = calculateDaysOverdue(overdueTitles, now);

    events.push({
      externalId: first.contract_external_id,
      customer: {
        name: first.name,
        document,
        email: toOptionalString(first.email),
        phone: toOptionalString(first.phone),
        externalId: first.erp_client_id,
      },
      contract: {
        code: first.contract_number,
        status: mapContractStatus(first.erp_contract_status),
        startDate: first.contract_date.toISOString(),
        monthlyValue:
          first.contract_monthly_amount !== null
            ? Number(first.contract_monthly_amount)
            : undefined,
        externalId: first.contract_external_id,
      },
      invoices: titles.map((title) => ({
        externalId: title.title_external_id,
        invoiceNumber: toOptionalString(title.invoice_number),
        status: isOverdue(title, now)
          ? InvoiceStatus.OVERDUE
          : InvoiceStatus.OPEN,
        dueDate: title.expiration_date.toISOString(),
        amount: Number(title.title_amount),
        paidAmount: 0,
      })),
      case: {
        status: CollectionStatus.WAITING_TRIAGE,
        priority:
          daysOverdue > HIGH_PRIORITY_THRESHOLD_DAYS
            ? Priority.HIGH
            : Priority.MEDIUM,
        outstandingAmount,
        daysOverdue,
      },
    });
  }

  return {
    payload: { source: ERP_SYNC_SOURCE, events },
    skippedContracts,
  };
}
