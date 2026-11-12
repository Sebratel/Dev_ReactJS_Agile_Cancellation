import type { AuditAction } from '@prisma/client';
import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import type { AuditLogListItemResponse } from '@/modules/audit-logs/dto/audit-log-list-item.response';
import type {
  AuditLogCategoryFilter,
  AuditLogsQueryDto,
} from '@/modules/audit-logs/dto/audit-logs-query.dto';

export type AuditLogsListParams = {
  page?: number;
  limit?: number;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  search?: string;
  category?: AuditLogCategoryFilter;
};

export interface AuditLogsRepository {
  listAuditLogs(
    params: AuditLogsListParams,
  ): Promise<PaginatedResponse<AuditLogListItemResponse>>;
}

export function mapQueryDtoToListParams(
  query: AuditLogsQueryDto,
): AuditLogsListParams {
  return {
    page: query.page,
    limit: query.limit,
    actorId: query.actorId,
    entityType: query.entityType,
    entityId: query.entityId,
    action: query.action,
    startDate: query.startDate,
    endDate: query.endDate,
    search: query.search,
    category: query.category,
  };
}
