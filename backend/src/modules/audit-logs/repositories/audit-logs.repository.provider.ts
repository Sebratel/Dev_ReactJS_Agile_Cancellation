import type { Provider } from '@nestjs/common';
import { AUDIT_LOGS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { PrismaService } from '@/database/prisma/prisma.service';
import { createAuditLogsRepository } from '@/modules/audit-logs/repositories/audit-logs.repository.factory';

export const auditLogsRepositoryProvider: Provider = {
  provide: AUDIT_LOGS_REPOSITORY,
  useFactory: (prisma: PrismaService) => createAuditLogsRepository(prisma),
  inject: [PrismaService],
};
