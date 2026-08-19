import {
  CollectionStatus,
  type ContractStatus,
  InvoiceStatus,
  type PaymentPromiseStatus,
  type Priority,
  type Prisma,
} from '@prisma/client';
import type { CollectionCaseListItemResponse } from '@/modules/collection-cases/dto/collection-case-list-item.response';
import type {
  CollectionCasesListParams,
  CollectionCasesSortBy,
  CollectionCasesSortDirection,
} from '@/modules/collection-cases/repositories/collection-cases.repository';

const FINALIZED_STATUSES: CollectionStatus[] = [
  CollectionStatus.CLOSED,
  CollectionStatus.RECOVERED,
];

export const OPEN_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.OPEN,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

export type MockCollectionCaseListRecord = CollectionCaseListItemResponse & {
  assignedUserId: string | null;
  customerDocument: string;
  contractExternalId: string | null;
  createdAt: string;
  updatedAt: string;
  hasCollectionAttempts: boolean;
  paymentPromiseStatuses: PaymentPromiseStatus[];
};

function getTomorrowStart(date: Date) {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function getStartOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getEndOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

// As datas de vencimento das faturas sao gravadas como meia-noite UTC (dia
// "puro", sem significado de horario). Os filtros de 1o/2o vencimento
// precisam comparar o dia calendario em UTC — usar hora local do processo
// aqui causaria um desvio de dia quando o servidor roda em fuso diferente do
// horario de Brasilia (ex.: servidor em UTC exibe 20/10 no navegador em
// UTC-3 como 19/10, e o filtro por "19/10" nao encontraria nada).
function getStartOfDayUTC(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function getEndOfDayUTC(date: Date) {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function parseDateInput(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

/**
 * Confere se as duas faturas em aberto mais antigas de um contrato (ja
 * ordenadas ascendente por vencimento, limitadas as 2 primeiras — a mesma
 * consulta usada para exibir firstOverdueDate/secondOverdueDate na tela)
 * batem com os filtros de 1o/2o vencimento. Usada pelo repositorio Prisma
 * para resolver o filtro por RANK (nao "existe alguma fatura", ver
 * comentario em buildCollectionCasesWhere).
 */
export function matchesOverdueDateFilters(
  oldestOpenInvoices: Array<{ dueDate: Date }>,
  params: Pick<CollectionCasesListParams, 'firstDueDate' | 'secondDueDate'>,
): boolean {
  const firstDueDate = parseDateInput(params.firstDueDate);
  const secondDueDate = parseDateInput(params.secondDueDate);

  if (!firstDueDate && !secondDueDate) {
    return true;
  }

  const [first, second] = oldestOpenInvoices;

  if (firstDueDate) {
    if (!first) {
      return false;
    }

    const time = first.dueDate.getTime();
    if (
      time < getStartOfDayUTC(firstDueDate).getTime() ||
      time > getEndOfDayUTC(firstDueDate).getTime()
    ) {
      return false;
    }
  }

  if (secondDueDate) {
    if (!second) {
      return false;
    }

    const time = second.dueDate.getTime();
    if (
      time < getStartOfDayUTC(secondDueDate).getTime() ||
      time > getEndOfDayUTC(secondDueDate).getTime()
    ) {
      return false;
    }
  }

  return true;
}

export function normalizeListParams(
  params: CollectionCasesListParams,
): CollectionCasesListParams {
  return {
    ...params,
    page: Math.max(1, params.page ?? 1),
    limit: Math.max(1, Math.min(100, params.limit ?? 10)),
    search: params.search?.trim() || undefined,
  };
}

export function buildCollectionCasesWhere(
  params: CollectionCasesListParams,
  now = new Date(),
): Prisma.CollectionCaseWhereInput {
  const where: Prisma.CollectionCaseWhereInput = {};

  if (params.status) {
    where.status = params.status as CollectionStatus;
  }

  if (params.priority) {
    where.priority = params.priority as Priority;
  }

  if (params.assignedToId) {
    where.assignedUserId = params.assignedToId;
  }

  const contractConditions: Prisma.ContractWhereInput[] = [];

  if (params.contractStatus) {
    contractConditions.push({
      status: params.contractStatus as ContractStatus,
    });
  }

  if (params.search) {
    where.OR = [
      { customer: { name: { contains: params.search } } },
      { customer: { document: { contains: params.search } } },
      { contract: { externalId: { contains: params.search } } },
      { contract: { code: { contains: params.search } } },
    ];
  }

  if (
    params.daysOverdueMin !== undefined ||
    params.daysOverdueMax !== undefined
  ) {
    where.daysOverdue = {
      ...(params.daysOverdueMin !== undefined
        ? { gte: params.daysOverdueMin }
        : {}),
      ...(params.daysOverdueMax !== undefined
        ? { lte: params.daysOverdueMax }
        : {}),
    };
  }

  if (
    params.totalOutstandingMin !== undefined ||
    params.totalOutstandingMax !== undefined
  ) {
    where.outstandingAmount = {
      ...(params.totalOutstandingMin !== undefined
        ? { gte: params.totalOutstandingMin }
        : {}),
      ...(params.totalOutstandingMax !== undefined
        ? { lte: params.totalOutstandingMax }
        : {}),
    };
  }

  // "1o vencimento" e "2o vencimento" NAO entram aqui como "existe alguma
  // fatura em aberto vencendo nesse dia" — isso pareceria certo apenas
  // enquanto o contrato tiver exatamente 2 faturas em aberto (a regra que
  // dispara a entrada na esteira), mas nada impede um contrato acumular uma
  // 3a fatura vencida enquanto o caso segue aberto (ver erp-sync.service.ts,
  // a sincronizacao traz TODAS as faturas em aberto do contrato, nao so as
  // 2 que dispararam o gatilho). Nesse cenario, "some" casaria com a 3a
  // fatura mesmo que ela nao seja a 1a/2a exibida na tela — o caso apareceria
  // no resultado com datas diferentes das buscadas. Por isso a comparacao
  // pelo RANK (1a e 2a fatura em aberto mais antigas, a mesma logica usada
  // para exibir firstOverdueDate/secondOverdueDate) e feita a parte, no
  // repositorio Prisma, via resolveDueDateFilteredCaseIds — nao aqui.

  if (contractConditions.length > 0) {
    where.contract = { AND: contractConditions };
  }

  if (params.slaStatus) {
    applySlaStatusFilter(where, params.slaStatus, now, params.status);
  }

  if (params.createdToday) {
    where.createdAt = {
      gte: getStartOfDay(now),
      lt: getTomorrowStart(now),
    };
  }

  if (params.interactionStatus === 'none') {
    where.collectionAttempts = { none: {} };
  }

  if (params.promiseStatus) {
    where.paymentPromises = {
      some: { status: params.promiseStatus },
    };
  }

  return where;
}

function applySlaStatusFilter(
  where: Prisma.CollectionCaseWhereInput,
  slaStatus: NonNullable<CollectionCasesListParams['slaStatus']>,
  now: Date,
  status?: string,
) {
  switch (slaStatus) {
    case 'no_sla':
      where.slaDueAt = null;
      break;
    case 'overdue':
      where.slaDueAt = { lt: now };
      if (!status) {
        where.status = { notIn: FINALIZED_STATUSES };
      }
      break;
    case 'due_today':
      where.slaDueAt = {
        gte: getStartOfDay(now),
        lte: getEndOfDay(now),
      };
      break;
    case 'ok':
      where.slaDueAt = { gt: now };
      break;
    default:
      break;
  }
}

export function buildCollectionCasesOrderBy(
  params: CollectionCasesListParams,
): Prisma.CollectionCaseOrderByWithRelationInput[] {
  if (!params.sortBy) {
    return [{ daysOverdue: 'desc' }, { outstandingAmount: 'desc' }];
  }

  const direction: CollectionCasesSortDirection =
    params.sortDirection ?? 'desc';
  const primary = mapSortField(params.sortBy, direction);

  if (params.sortBy === 'daysOverdue') {
    return [primary, { outstandingAmount: 'desc' }];
  }

  if (params.sortBy === 'totalOutstanding') {
    return [primary, { daysOverdue: 'desc' }];
  }

  return [primary, { daysOverdue: 'desc' }, { outstandingAmount: 'desc' }];
}

function mapSortField(
  sortBy: CollectionCasesSortBy,
  direction: CollectionCasesSortDirection,
): Prisma.CollectionCaseOrderByWithRelationInput {
  switch (sortBy) {
    case 'totalOutstanding':
      return { outstandingAmount: direction };
    case 'firstOverdueDate':
      return { daysOverdue: direction === 'asc' ? 'desc' : 'asc' };
    case 'slaDueAt':
      return { slaDueAt: direction };
    case 'createdAt':
      return { createdAt: direction };
    case 'updatedAt':
      return { updatedAt: direction };
    case 'daysOverdue':
    default:
      return { daysOverdue: direction };
  }
}

function getFirstOverdueDate(record: MockCollectionCaseListRecord) {
  return (
    record.firstOverdueDate ??
    new Date(Date.now() - record.daysOverdue * 86_400_000).toISOString()
  );
}

/**
 * Dados mock nao guardam a 2a fatura vencida individualmente. Como a regra de
 * negocio e sempre duas faturas mensais em aberto vencidas, aproximamos a
 * segunda data como 30 dias apos a primeira (o suficiente para os filtros de
 * desenvolvimento; em modo `database` o valor vem direto das faturas reais).
 */
function getSecondOverdueDate(record: MockCollectionCaseListRecord) {
  const first = new Date(getFirstOverdueDate(record));
  return new Date(first.getTime() + 30 * 86_400_000).toISOString();
}

function matchesSlaStatus(
  record: MockCollectionCaseListRecord,
  slaStatus: CollectionCasesListParams['slaStatus'],
  now: Date,
) {
  if (!slaStatus) {
    return true;
  }

  if (slaStatus === 'no_sla') {
    return record.slaDueAt === null;
  }

  if (!record.slaDueAt) {
    return false;
  }

  const slaDueAt = new Date(record.slaDueAt);

  if (slaStatus === 'overdue') {
    return (
      slaDueAt.getTime() < now.getTime() &&
      !FINALIZED_STATUSES.includes(record.status as CollectionStatus)
    );
  }

  if (slaStatus === 'due_today') {
    return (
      slaDueAt.getTime() >= getStartOfDay(now).getTime() &&
      slaDueAt.getTime() <= getEndOfDay(now).getTime()
    );
  }

  return slaDueAt.getTime() > now.getTime();
}

export function filterMockCollectionCases(
  records: MockCollectionCaseListRecord[],
  params: CollectionCasesListParams,
  now = new Date(),
) {
  const search = params.search?.toLowerCase();

  return records.filter((record) => {
    if (params.status && record.status !== params.status) {
      return false;
    }

    if (params.priority && record.priority !== params.priority) {
      return false;
    }

    if (params.assignedToId && record.assignedUserId !== params.assignedToId) {
      return false;
    }

    if (params.contractStatus && record.contractStatus !== params.contractStatus) {
      return false;
    }

    if (search) {
      const haystack = [
        record.customerName,
        record.customerDocument,
        record.contractCode,
        record.contractExternalId ?? '',
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (
      params.daysOverdueMin !== undefined &&
      record.daysOverdue < params.daysOverdueMin
    ) {
      return false;
    }

    if (
      params.daysOverdueMax !== undefined &&
      record.daysOverdue > params.daysOverdueMax
    ) {
      return false;
    }

    const outstandingAmount = Number(record.outstandingAmount);

    if (
      params.totalOutstandingMin !== undefined &&
      outstandingAmount < params.totalOutstandingMin
    ) {
      return false;
    }

    if (
      params.totalOutstandingMax !== undefined &&
      outstandingAmount > params.totalOutstandingMax
    ) {
      return false;
    }

    const firstOverdueTime = new Date(getFirstOverdueDate(record)).getTime();
    const secondOverdueTime = new Date(getSecondOverdueDate(record)).getTime();
    const firstDueDate = parseDateInput(params.firstDueDate);
    const secondDueDate = parseDateInput(params.secondDueDate);

    if (
      firstDueDate &&
      (firstOverdueTime < getStartOfDayUTC(firstDueDate).getTime() ||
        firstOverdueTime > getEndOfDayUTC(firstDueDate).getTime())
    ) {
      return false;
    }

    if (
      secondDueDate &&
      (secondOverdueTime < getStartOfDayUTC(secondDueDate).getTime() ||
        secondOverdueTime > getEndOfDayUTC(secondDueDate).getTime())
    ) {
      return false;
    }

    if (!matchesSlaStatus(record, params.slaStatus, now)) {
      return false;
    }

    if (params.createdToday) {
      const createdAt = new Date(record.createdAt);

      if (
        createdAt.getTime() < getStartOfDay(now).getTime() ||
        createdAt.getTime() >= getTomorrowStart(now).getTime()
      ) {
        return false;
      }
    }

    if (params.interactionStatus === 'none' && record.hasCollectionAttempts) {
      return false;
    }

    if (
      params.promiseStatus &&
      !record.paymentPromiseStatuses.includes(params.promiseStatus)
    ) {
      return false;
    }

    return true;
  });
}

export function sortMockCollectionCases(
  records: MockCollectionCaseListRecord[],
  params: CollectionCasesListParams,
) {
  const direction = params.sortDirection ?? 'desc';
  const multiplier = direction === 'asc' ? 1 : -1;

  const sorted = [...records];

  sorted.sort((left, right) => {
    const sortBy = params.sortBy ?? 'daysOverdue';

    if (sortBy === 'daysOverdue') {
      return (left.daysOverdue - right.daysOverdue) * multiplier;
    }

    if (sortBy === 'totalOutstanding') {
      return (
        (Number(left.outstandingAmount) - Number(right.outstandingAmount)) *
        multiplier
      );
    }

    if (sortBy === 'firstOverdueDate') {
      return (
        (new Date(getFirstOverdueDate(left)).getTime() -
          new Date(getFirstOverdueDate(right)).getTime()) *
        multiplier
      );
    }

    if (sortBy === 'slaDueAt') {
      const leftValue = left.slaDueAt
        ? new Date(left.slaDueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightValue = right.slaDueAt
        ? new Date(right.slaDueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      return (leftValue - rightValue) * multiplier;
    }

    if (sortBy === 'updatedAt') {
      return (
        (new Date(left.updatedAt).getTime() -
          new Date(right.updatedAt).getTime()) *
        multiplier
      );
    }

    if (sortBy === 'createdAt') {
      return (
        (new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime()) *
        multiplier
      );
    }

    return 0;
  });

  if (!params.sortBy) {
    sorted.sort((left, right) => {
      if (left.daysOverdue !== right.daysOverdue) {
        return right.daysOverdue - left.daysOverdue;
      }

      return Number(right.outstandingAmount) - Number(left.outstandingAmount);
    });
  }

  return sorted;
}

export function toListItemResponse(
  record: MockCollectionCaseListRecord,
): CollectionCaseListItemResponse {
  return {
    id: record.id,
    customerName: record.customerName,
    customerPhone: record.customerPhone,
    contractCode: record.contractCode,
    contractStatus: record.contractStatus,
    firstOverdueDate: record.firstOverdueDate,
    secondOverdueDate: record.firstOverdueDate
      ? getSecondOverdueDate(record)
      : null,
    status: record.status,
    priority: record.priority,
    daysOverdue: record.daysOverdue,
    outstandingAmount: record.outstandingAmount,
    assignedTo: record.assignedTo,
    slaDueAt: record.slaDueAt,
    matrixAwaitingReply: record.matrixAwaitingReply,
    matrixLastOutboundAt: record.matrixLastOutboundAt,
    matrixLastReplyAt: record.matrixLastReplyAt,
  };
}
