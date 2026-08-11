import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { AuditLogsMockRepository } from '@/modules/audit-logs/repositories/audit-logs-mock.repository';
import { AuditLogsPrismaRepository } from '@/modules/audit-logs/repositories/audit-logs-prisma.repository';
import type { AuditLogsRepository } from '@/modules/audit-logs/repositories/audit-logs.repository';

export function createAuditLogsRepository(
  prisma: PrismaService,
): AuditLogsRepository {
  if (getDataSourceMode() === 'database') {
    return new AuditLogsPrismaRepository(prisma);
  }

  return new AuditLogsMockRepository();
}
