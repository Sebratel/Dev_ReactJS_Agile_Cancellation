import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createApiResponse } from '@/common/responses/api-response';
import type { AuditLogsListParams } from '@/modules/audit-logs/repositories/audit-logs.repository';
import type { AuditLogsRepository } from '@/modules/audit-logs/repositories/audit-logs.repository';

@Injectable()
export class AuditLogsService {
  constructor(
    @Inject(AUDIT_LOGS_REPOSITORY)
    private readonly auditLogsRepository: AuditLogsRepository,
  ) {}

  async listAuditLogs(params: AuditLogsListParams) {
    const result = await this.auditLogsRepository.listAuditLogs(params);

    return createApiResponse(result);
  }
}
