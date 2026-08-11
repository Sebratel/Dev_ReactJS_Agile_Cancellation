import {
  CollectionStatus,
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
  return new Date(Date.now() - record.daysOverdue * 86_400_000).toISOString();
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
    contractCode: record.contractCode,
    status: record.status,
    priority: record.priority,
    daysOverdue: record.daysOverdue,
    outstandingAmount: record.outstandingAmount,
    assignedTo: record.assignedTo,
    slaDueAt: record.slaDueAt,
  };
}
