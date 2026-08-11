import { Module } from '@nestjs/common';
import { AuditLogsController } from '@/modules/audit-logs/audit-logs.controller';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';
import { auditLogsRepositoryProvider } from '@/modules/audit-logs/repositories/audit-logs.repository.provider';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, auditLogsRepositoryProvider],
})
export class AuditLogsModule {}
