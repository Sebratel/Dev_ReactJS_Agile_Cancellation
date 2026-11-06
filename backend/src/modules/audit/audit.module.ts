import { Module } from '@nestjs/common';
import { AuditRetentionService } from '@/modules/audit/audit-retention.service';
import { AuditService } from '@/modules/audit/audit.service';

@Module({
  providers: [AuditService, AuditRetentionService],
  exports: [AuditService],
})
export class AuditModule {}
