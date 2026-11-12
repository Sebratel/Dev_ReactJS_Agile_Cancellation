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
  type AuditLogMapContext,
} from '@/modules/audit-logs/utils/audit-logs-list.utils';

// Limite de casos encontrados pela busca por cliente/contrato (evita um IN
// gigante quando o termo é muito genérico).
const SEARCH_CASE_LIMIT = 500;

function readAssignedUserId(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return null;
  }

  const value = (snapshot as Record<string, unknown>).assignedUserId;

  return typeof value === 'string' ? value : null;
}

@Injectable()
export class AuditLogsPrismaRepository implements AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Casos cujo cliente (nome/documento) ou contrato (código) contém o termo.
  private async findCaseIdsBySearch(search: string | undefined) {
    if (!search) {
      return [];
    }

    const cases = await this.prisma.collectionCase.findMany({
      where: {
        OR: [
          { customer: { is: { name: { contains: search } } } },
          { contract: { is: { code: { contains: search } } } },
        ],
      },
      select: { id: true },
      take: SEARCH_CASE_LIMIT,
    });

    return cases.map((item) => item.id);
  }

  private async buildMapContext(
    records: Array<{
      entityType: string;
      entityId: string;
      beforeSnapshot: unknown;
      afterSnapshot: unknown;
    }>,
  ): Promise<AuditLogMapContext> {
    const caseIds = [
      ...new Set(
        records
          .filter((record) => record.entityType === 'COLLECTION_CASE')
          .map((record) => record.entityId),
      ),
    ];
    const userIds = [
      ...new Set(
        records.flatMap((record) =>
          [
            readAssignedUserId(record.beforeSnapshot),
            readAssignedUserId(record.afterSnapshot),
          ].filter((id): id is string => id !== null),
        ),
      ),
    ];

    const [cases, users] = await Promise.all([
      caseIds.length > 0
        ? this.prisma.collectionCase.findMany({
            where: { id: { in: caseIds } },
            select: {
              id: true,
              customer: { select: { name: true } },
              contract: { select: { code: true } },
            },
          })
        : [],
      userIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    return {
      subjects: new Map(
        cases.map((item) => [
          item.id,
          {
            customerName: item.customer.name,
            contractCode: item.contract?.code ?? null,
          },
        ]),
      ),
      userNames: new Map(users.map((user) => [user.id, user.name])),
    };
  }

  async listAuditLogs(params: AuditLogsListParams) {
    const normalized = normalizeAuditLogsListParams(params);
    const searchCaseIds = await this.findCaseIdsBySearch(normalized.search);
    const where = buildAuditLogsWhere(normalized, searchCaseIds);
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
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const context = await this.buildMapContext(records);
    const items: AuditLogListItemResponse[] = records.map((record) =>
      mapAuditLogRecord(record, context),
    );

    return createPaginatedResponse(
      items,
      normalized.page!,
      normalized.limit!,
      total,
    );
  }
}
