import {
  CollectionStatus,
  type ContractStatus,
  InvoiceStatus,
  type PaymentPromiseStatus,
  type Priority,
  type Prisma,
} from '@prisma/client';
import { NO_CANCELLATION_REASON_LABEL } from '@/common/cancellation-reason';
import type { CollectionCaseListItemResponse } from '@/modules/collection-cases/dto/collection-case-list-item.response';
import { PORTFOLIO_ACTIVE_STATUSES } from '@/modules/collection-cases/utils/portfolio-cases.util';
import type {
  CollectionCasesListParams,
  CollectionCasesSortBy,
  CollectionCasesSortDirection,
} from '@/modules/collection-cases/repositories/collection-cases.repository';

const FINALIZED_STATUSES: CollectionStatus[] = [
  CollectionStatus.CLOSED,
  CollectionStatus.RECOVERED,
  CollectionStatus.PAYMENT_MADE,
  CollectionStatus.RENEGOTIATED,
  CollectionStatus.REACTIVATED,
];

// O motivo vem do ERP com prefixo ("Cancelamento - Inadimplência"); o filtro usa
// o texto limpo exibido na tela, então casa o valor exato ou o sufixo após o
// separador.
function buildCancellationReasonCondition(
  reason: string,
): Prisma.ContractWhereInput {
  if (reason === NO_CANCELLATION_REASON_LABEL) {
    return { cancellationReason: null };
  }

  return {
    OR: [
      { cancellationReason: { equals: reason } },
      { cancellationReason: { endsWith: ` - ${reason}` } },
      { cancellationReason: { endsWith: ` – ${reason}` } },
      { cancellationReason: { endsWith: `: ${reason}` } },
    ],
  };
}

export const OPEN_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.OPEN,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

export type MockCollectionCaseListRecord = CollectionCaseListItemResponse & {
  assignedUserId: string | null;
  assignedAt?: string | null;
  customerDocument: string;
  contractExternalId: string | null;
  createdAt: string;
  updatedAt: string;
  hasCollectionAttempts: boolean;
  paymentPromiseStatuses: PaymentPromiseStatus[];
} & { totalAttempts: number };

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

export type CollectionCasesWhereOptions = {
  // Ids com contato manual so de ciclo anterior (ver findStaleContactCaseIds);
  // necessario quando interactionStatus esta presente.
  staleContactCaseIds?: string[];
};

export function buildCollectionCasesWhere(
  params: CollectionCasesListParams,
  now = new Date(),
  options: CollectionCasesWhereOptions = {},
): Prisma.CollectionCaseWhereInput {
  const where: Prisma.CollectionCaseWhereInput = {};

  // Sem filtro de status explicito, a lista mostra so a carteira ativa (mesma
  // base do card de carteira). Status finalizado escolhido no filtro continua
  // funcionando (historico/auditoria). A busca por texto (nome/documento/
  // contrato) tambem nao restringe: acha o cliente em qualquer status.
  if (params.reactivated) {
    where.reactivatedAt = { not: null };
  }

  // Reativados (RECOVERED/REACTIVATED) não estão na carteira ativa: sem status
  // explícito, o filtro `reactivated` não aplica a restrição de carteira.
  if (params.status) {
    where.status = params.status as CollectionStatus;
  } else if (params.statusIn && params.statusIn.length > 0) {
    where.status = { in: params.statusIn as CollectionStatus[] };
  } else if (!params.search && !params.reactivated) {
    where.status = { in: PORTFOLIO_ACTIVE_STATUSES };
  }

  if (params.priority) {
    where.priority = params.priority as Priority;
  }

  if (params.assignedToId === 'unassigned') {
    // Carteira "Sem responsavel" — casos ativos sem atendente atribuido.
    where.assignedUserId = null;
  } else if (params.assignedToId) {
    where.assignedUserId = params.assignedToId;
  }

  if (params.hsmDeliveryState) {
    where.hsmDeliveryState = params.hsmDeliveryState;
  }

  const contractConditions: Prisma.ContractWhereInput[] = [];

  if (params.contractStatus) {
    contractConditions.push({
      status: params.contractStatus as ContractStatus,
    });
  }

  if (params.cancellationReason?.trim()) {
    contractConditions.push(
      buildCancellationReasonCondition(params.cancellationReason.trim()),
    );
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
    applySlaStatusFilter(where, params.slaStatus, now);
  }

  if (params.createdToday) {
    where.createdAt = {
      gte: getStartOfDay(now),
      lt: getTomorrowStart(now),
    };
  }

  // Filtro por data de atribuicao (assignedAt). Intervalo inclusivo por dia
  // (UTC, como os demais filtros por data). So casa casos com responsavel
  // (assignedAt preenchido).
  const assignedFrom = parseDateInput(params.assignedFrom);
  const assignedTo = parseDateInput(params.assignedTo);
  if (assignedFrom || assignedTo) {
    where.assignedAt = {
      ...(assignedFrom ? { gte: getStartOfDayUTC(assignedFrom) } : {}),
      ...(assignedTo ? { lte: getEndOfDayUTC(assignedTo) } : {}),
    };
  }

  // "Contatado" = contato manual (isAutomatic false) DENTRO do ciclo atual
  // (attemptedAt >= cycleStartedAt; sem cycleStartedAt, qualquer manual) — mesma
  // definicao do anel de carteira. "Nao contatado" (ou o legado 'none') = o
  // resto, incluindo reabertos so com contato de ciclo anterior.
  const staleIds = options.staleContactCaseIds ?? [];
  if (params.interactionStatus === 'contacted') {
    where.collectionAttempts = { some: { isAutomatic: false } };
    if (staleIds.length > 0) {
      where.AND = [...toArray(where.AND), { id: { notIn: staleIds } }];
    }
  } else if (
    params.interactionStatus === 'not_contacted' ||
    params.interactionStatus === 'none'
  ) {
    where.AND = [
      ...toArray(where.AND),
      {
        OR: [
          { collectionAttempts: { none: { isAutomatic: false } } },
          ...(staleIds.length > 0 ? [{ id: { in: staleIds } }] : []),
        ],
      },
    ];
  }

  if (params.promiseStatus) {
    where.paymentPromises = {
      some: { status: params.promiseStatus },
    };
  }

  if (params.origin !== undefined) {
    where.origin = params.origin === 'null' ? null : params.origin;
  }

  return where;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function applySlaStatusFilter(
  where: Prisma.CollectionCaseWhereInput,
  slaStatus: NonNullable<CollectionCasesListParams['slaStatus']>,
  now: Date,
) {
  switch (slaStatus) {
    case 'no_sla':
      where.slaDueAt = null;
      break;
    case 'overdue':
      where.slaDueAt = { lt: now };
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
    case 'lastContactAt':
      return { lastContactAt: direction };
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
    if (params.status) {
      if (record.status !== params.status) {
        return false;
      }
    } else if (params.statusIn && params.statusIn.length > 0) {
      if (!params.statusIn.includes(record.status)) {
        return false;
      }
    } else if (
      !search &&
      !PORTFOLIO_ACTIVE_STATUSES.includes(record.status as CollectionStatus)
    ) {
      return false;
    }

    if (params.priority && record.priority !== params.priority) {
      return false;
    }

    if (params.assignedToId === 'unassigned') {
      if (record.assignedUserId !== null) {
        return false;
      }
    } else if (
      params.assignedToId &&
      record.assignedUserId !== params.assignedToId
    ) {
      return false;
    }

    if (
      params.hsmDeliveryState &&
      record.hsmDeliveryState !== params.hsmDeliveryState
    ) {
      return false;
    }

    if (
      params.contractStatus &&
      record.contractStatus !== params.contractStatus
    ) {
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

    const assignedFrom = parseDateInput(params.assignedFrom);
    const assignedTo = parseDateInput(params.assignedTo);
    if (assignedFrom || assignedTo) {
      if (!record.assignedAt) {
        return false;
      }
      const assignedTime = new Date(record.assignedAt).getTime();
      if (
        assignedFrom &&
        assignedTime < getStartOfDayUTC(assignedFrom).getTime()
      ) {
        return false;
      }
      if (assignedTo && assignedTime > getEndOfDayUTC(assignedTo).getTime()) {
        return false;
      }
    }

    // Mock: totalAttempts > 1 = teve tentativa manual (alem da automatica).
    if (params.interactionStatus === 'contacted' && record.totalAttempts <= 1) {
      return false;
    }
    if (
      (params.interactionStatus === 'not_contacted' ||
        params.interactionStatus === 'none') &&
      record.totalAttempts > 1
    ) {
      return false;
    }

    if (
      params.promiseStatus &&
      !record.paymentPromiseStatuses.includes(params.promiseStatus)
    ) {
      return false;
    }

    if (params.origin !== undefined) {
      const expected = params.origin === 'null' ? null : params.origin;
      if (record.origin !== expected) {
        return false;
      }
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

    if (sortBy === 'lastContactAt') {
      // Mock nao tem data de tentativa individual; usa updatedAt como proxy.
      return (
        (new Date(left.updatedAt).getTime() -
          new Date(right.updatedAt).getTime()) *
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
    customerPhone2: record.customerPhone2,
    contractCode: record.contractCode,
    contractStatus: record.contractStatus,
    contractErpStatus: record.contractErpStatus ?? null,
    contractCancellationReason: record.contractCancellationReason ?? null,
    contractCancellationReasonCategory:
      record.contractCancellationReasonCategory ?? null,
    firstOverdueDate: record.firstOverdueDate,
    secondOverdueDate: record.firstOverdueDate
      ? getSecondOverdueDate(record)
      : null,
    status: record.status,
    priority: record.priority,
    daysOverdue: record.daysOverdue,
    outstandingAmount: record.outstandingAmount,
    totalAttempts: record.totalAttempts,
    assignedTo: record.assignedTo,
    assignedAt: record.assignedAt ?? null,
    slaDueAt: record.slaDueAt,
    matrixAwaitingReply: record.matrixAwaitingReply,
    matrixLastOutboundAt: record.matrixLastOutboundAt,
    matrixLastReplyAt: record.matrixLastReplyAt,
    hsmDeliveryState: record.hsmDeliveryState ?? null,
    hsmDeliveryDetail: record.hsmDeliveryDetail ?? null,
    lastContactAt: record.lastContactAt ?? null,
    origin: record.origin ?? null,
  };
}
