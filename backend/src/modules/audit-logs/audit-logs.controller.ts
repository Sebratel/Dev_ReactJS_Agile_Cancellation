import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuditLogsQueryDto } from '@/modules/audit-logs/dto/audit-logs-query.dto';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';
import { mapQueryDtoToListParams } from '@/modules/audit-logs/repositories/audit-logs.repository';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR')
  listAuditLogs(@Query() query: AuditLogsQueryDto) {
    return this.auditLogsService.listAuditLogs(mapQueryDtoToListParams(query));
  }
}
