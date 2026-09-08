import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ListIntegrationEventsDto } from '@/modules/integration-events/dto/list-integration-events.dto';
import { IntegrationEventsService } from '@/modules/integration-events/integration-events.service';

@Controller('integration-events')
export class IntegrationEventsController {
  constructor(private readonly service: IntegrationEventsService) {}

  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  list(@Query() query: ListIntegrationEventsDto) {
    return this.service.list(query);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  // Frescor da base: ultima sincronizacao/ingestao e entrada de casos novos.
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('sync-health')
  getSyncHealth() {
    return this.service.getSyncHealth();
  }
}
