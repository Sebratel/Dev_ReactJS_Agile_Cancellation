import { AuditAction, type Prisma } from '@prisma/client';
import type { AuditLogCategoryFilter } from '@/modules/audit-logs/dto/audit-logs-query.dto';
import type { AuditLogListItemResponse } from '@/modules/audit-logs/dto/audit-log-list-item.response';
import type { AuditLogsListParams } from '@/modules/audit-logs/repositories/audit-logs.repository';
import { sanitizeAuditMetadata } from '@/modules/audit-logs/utils/audit-log-sanitize.util';
import { resolveAuditLogPresentation } from '@/modules/audit-logs/utils/audit-log-presentation.util';
import { resolveAuditLogSummary } from '@/modules/audit-logs/utils/audit-log-summary.util';

export const AUDIT_LOGS_DEFAULT_LIMIT = 20;

function getEndOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function normalizeAuditLogsListParams(
  params: AuditLogsListParams,
): AuditLogsListParams {
  return {
    ...params,
    page: Math.max(1, params.page ?? 1),
    limit: Math.max(1, Math.min(100, params.limit ?? AUDIT_LOGS_DEFAULT_LIMIT)),
    search: params.search?.trim() || undefined,
    actorId: params.actorId?.trim() || undefined,
    entityType: params.entityType?.trim() || undefined,
    entityId: params.entityId?.trim() || undefined,
  };
}

function isAuditAction(value: string): value is AuditAction {
  return Object.values(AuditAction).includes(value as AuditAction);
}

function metaEquals(path: string, value: string): Prisma.AuditLogWhereInput {
  return { metadata: { path, equals: value } };
}

function buildCategoryWhere(
  category: AuditLogCategoryFilter,
): Prisma.AuditLogWhereInput {
  switch (category) {
    case 'CONTACT':
      return {
        OR: [
          {
            action: AuditAction.INTEGRATION,
            ...metaEquals('$.resourceType', 'COLLECTION_ATTEMPT'),
          },
          {
            action: AuditAction.CREATE,
            // Tentativas de contato guardam attemptId (cuid, começa com "c").
            metadata: { path: '$.attemptId', string_starts_with: 'c' },
          },
        ],
      };
    case 'PROMISE':
      return metaEquals('$.resourceType', 'PAYMENT_PROMISE');
    case 'CANCELLATION':
      return {
        OR: [
          metaEquals('$.resourceType', 'CANCELLATION_PROCESS'),
          metaEquals('$.resourceType', 'CANCELLATION_STEP'),
          metaEquals('$.action', 'REVERT_CANCELLATION'),
          metaEquals('$.action', 'RECOVER_CANCELLED'),
          metaEquals('$.action', 'CANCELLED_RECOVERY_RECOVERED'),
          metaEquals('$.action', 'CANCELLED_RECOVERY_REACTIVATED'),
        ],
      };
    case 'ACCESS':
      return {
        action: { in: [AuditAction.LOGIN, AuditAction.LOGOUT] },
      };
    case 'EXPORT':
      return { action: AuditAction.EXPORT };
    case 'NOTE':
      return metaEquals('$.resourceType', 'CASE_NOTE');
    case 'ADMIN':
      return {
        OR: [
          metaEquals('$.resourceType', 'USER'),
          metaEquals('$.resourceType', 'SETTING'),
        ],
      };
    case 'MESSAGE':
      return metaEquals('$.resourceType', 'BULK_CONTACT_JOB');
    case 'ASSIGNMENT':
      return {
        action: AuditAction.UPDATE,
        ...metaEquals('$.field', 'assignedUserId'),
      };
  }
}

// `extraEntityIds`: casos cujo cliente/contrato bate com a busca — a busca
// textual também encontra registros pelo nome do cliente ou código do contrato.
export function buildAuditLogsWhere(
  params: AuditLogsListParams,
  extraEntityIds: string[] = [],
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (params.category) {
    where.AND = [buildCategoryWhere(params.category)];
  }

  if (params.actorId) {
    where.performedByUserId = params.actorId;
  }

  if (params.entityType) {
    where.entityType = params.entityType;
  }

  if (params.entityId) {
    where.entityId = params.entityId;
  }

  if (params.action) {
    where.action = params.action;
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {};

    if (params.startDate) {
      where.createdAt.gte = new Date(params.startDate);
    }

    if (params.endDate) {
      where.createdAt.lte = getEndOfDay(new Date(params.endDate));
    }
  }

  if (params.search) {
    const search = params.search;
    const orFilters: Prisma.AuditLogWhereInput[] = [
      { entityId: { contains: search } },
      { entityType: { contains: search } },
      {
        performedBy: {
          is: {
            name: { contains: search },
          },
        },
      },
      {
        performedBy: {
          is: {
            email: { contains: search },
          },
        },
      },
    ];

    if (isAuditAction(search)) {
      orFilters.push({ action: search });
    }

    if (extraEntityIds.length > 0) {
      orFilters.push({ entityId: { in: extraEntityIds } });
    }

    where.OR = orFilters;
  }

  return where;
}

type AuditLogRecordLike = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: unknown;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  createdAt: Date | string;
  performedBy?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
};

export type AuditLogMapContext = {
  // Cliente/contrato por id do caso de cobrança.
  subjects?: ReadonlyMap<
    string,
    { customerName: string; contractCode: string | null }
  >;
  // Nomes de usuários citados nos snapshots (ex.: nova responsável).
  userNames?: ReadonlyMap<string, string>;
};

export function mapAuditLogRecord(
  record: AuditLogRecordLike,
  context: AuditLogMapContext = {},
): AuditLogListItemResponse {
  const metadata = sanitizeAuditMetadata(record.metadata);
  const presentation = resolveAuditLogPresentation({
    action: record.action,
    metadata,
    beforeSnapshot: record.beforeSnapshot,
    afterSnapshot: record.afterSnapshot,
    userNames: context.userNames,
  });

  return {
    id: record.id,
    actor: record.performedBy
      ? {
          id: record.performedBy.id,
          name: record.performedBy.name,
          email: record.performedBy.email,
          avatarUrl: record.performedBy.avatarUrl ?? null,
        }
      : null,
    actorLabel: record.performedBy
      ? null
      : typeof metadata.email === 'string'
        ? metadata.email
        : null,
    entityType: record.entityType,
    entityId: record.entityId,
    action: record.action,
    summary: resolveAuditLogSummary(record.action, metadata),
    category: presentation.category,
    verb: presentation.verb,
    detail: presentation.detail,
    subject:
      record.entityType === 'COLLECTION_CASE'
        ? (context.subjects?.get(record.entityId) ?? null)
        : null,
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : record.createdAt,
    metadata,
  };
}

export type MockAuditLogListRecord = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedByUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function filterMockAuditLogs(
  records: MockAuditLogListRecord[],
  params: AuditLogsListParams,
): MockAuditLogListRecord[] {
  let filtered = [...records];

  if (params.actorId) {
    filtered = filtered.filter(
      (record) => record.performedByUserId === params.actorId,
    );
  }

  if (params.entityType) {
    filtered = filtered.filter(
      (record) => record.entityType === params.entityType,
    );
  }

  if (params.entityId) {
    filtered = filtered.filter((record) => record.entityId === params.entityId);
  }

  if (params.action) {
    filtered = filtered.filter((record) => record.action === params.action);
  }

  if (params.startDate) {
    const start = new Date(params.startDate).getTime();
    filtered = filtered.filter(
      (record) => new Date(record.createdAt).getTime() >= start,
    );
  }

  if (params.endDate) {
    const end = getEndOfDay(new Date(params.endDate)).getTime();
    filtered = filtered.filter(
      (record) => new Date(record.createdAt).getTime() <= end,
    );
  }

  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter((record) => {
      const haystack = [
        record.entityId,
        record.entityType,
        record.action,
        record.actorName ?? '',
        record.actorEmail ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  return filtered.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
