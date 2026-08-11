import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type { PrismaService } from '@/database/prisma/prisma.service';
import type { AuditLogListItemResponse } from '@/modules/audit-logs/dto/audit-log-list-item.response';
import type {
  AuditLogsListParams,
  AuditLogsRepository,
} from '@/modules/audit-logs/repositories/audit-logs.repository';
import {
  buildAuditLogsWhere,
  mapAuditLogRecord,
  normalizeAuditLogsListParams,
} from '@/modules/audit-logs/utils/audit-logs-list.utils';

@Injectable()
export class AuditLogsPrismaRepository implements AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(params: AuditLogsListParams) {
    const normalized = normalizeAuditLogsListParams(params);
    const where = buildAuditLogsWhere(normalized);
    const skip = (normalized.page! - 1) * normalized.limit!;

    const [records, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: normalized.limit,
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogListItemResponse[] = records.map((record) =>
      mapAuditLogRecord(record),
    );

    return createPaginatedResponse(
      items,
      normalized.page!,
      normalized.limit!,
      total,
    );
  }
}
