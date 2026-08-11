import { Module } from '@nestjs/common';
import { IntegrationEventsController } from '@/modules/integration-events/integration-events.controller';
import { IntegrationEventsService } from '@/modules/integration-events/integration-events.service';
import { IntegrationEventsPrismaRepository } from '@/modules/integration-events/repositories/integration-events-prisma.repository';
import { INTEGRATION_EVENTS_REPOSITORY } from '@/modules/integration-events/repositories/integration-events.repository';

@Module({
  controllers: [IntegrationEventsController],
  providers: [
    IntegrationEventsService,
    {
      provide: INTEGRATION_EVENTS_REPOSITORY,
      useClass: IntegrationEventsPrismaRepository,
    },
  ],
})
export class IntegrationEventsModule {}
