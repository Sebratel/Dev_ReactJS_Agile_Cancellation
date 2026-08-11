import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import { MOCK_AUTH_USER_DEFINITIONS } from '@/modules/auth/mocks/mock-auth-users';
import { mockAuditLogs } from '@/modules/collection-cases/mocks/collection-cases.mock';
import type {
  AuditLogsListParams,
  AuditLogsRepository,
} from '@/modules/audit-logs/repositories/audit-logs.repository';
import {
  filterMockAuditLogs,
  mapAuditLogRecord,
  normalizeAuditLogsListParams,
  type MockAuditLogListRecord,
} from '@/modules/audit-logs/utils/audit-logs-list.utils';

function resolveMockActorName(userId: string | null | undefined) {
  if (!userId) {
    return null;
  }

  return (
    MOCK_AUTH_USER_DEFINITIONS.find((user) => user.id === userId)?.name ?? null
  );
}

function resolveMockActorEmail(userId: string | null | undefined) {
  if (!userId) {
    return null;
  }

  return (
    MOCK_AUTH_USER_DEFINITIONS.find((user) => user.id === userId)?.email ?? null
  );
}

function buildMockAuditLogRecords(): MockAuditLogListRecord[] {
  return mockAuditLogs.map((entry, index) => ({
    id: `mock-audit-${index + 1}`,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    performedByUserId: entry.performedByUserId,
    actorName: resolveMockActorName(entry.performedByUserId),
    actorEmail: resolveMockActorEmail(entry.performedByUserId),
    metadata: entry.metadata,
    createdAt: new Date(Date.now() - index * 60_000).toISOString(),
  }));
}

@Injectable()
export class AuditLogsMockRepository implements AuditLogsRepository {
  listAuditLogs(params: AuditLogsListParams) {
    const normalized = normalizeAuditLogsListParams(params);
    const filtered = filterMockAuditLogs(
      buildMockAuditLogRecords(),
      normalized,
    );
    const start = (normalized.page! - 1) * normalized.limit!;
    const pageItems = filtered.slice(start, start + normalized.limit!);

    const items = pageItems.map((record) =>
      mapAuditLogRecord({
        id: record.id,
        entityType: record.entityType,
        entityId: record.entityId,
        action: record.action,
        metadata: record.metadata,
        createdAt: record.createdAt,
        performedBy:
          record.performedByUserId && record.actorName && record.actorEmail
            ? {
                id: record.performedByUserId,
                name: record.actorName,
                email: record.actorEmail,
              }
            : null,
      }),
    );

    return Promise.resolve(
      createPaginatedResponse(
        items,
        normalized.page!,
        normalized.limit!,
        filtered.length,
      ),
    );
  }
}
