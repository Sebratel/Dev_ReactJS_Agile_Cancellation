import { Inject, Injectable } from '@nestjs/common';
import { createApiResponse } from '@/common/responses/api-response';
import type { ListIntegrationEventsDto } from '@/modules/integration-events/dto/list-integration-events.dto';
import {
  INTEGRATION_EVENTS_REPOSITORY,
  type IntegrationEventsRepository,
} from '@/modules/integration-events/repositories/integration-events.repository';

@Injectable()
export class IntegrationEventsService {
  constructor(
    @Inject(INTEGRATION_EVENTS_REPOSITORY)
    private readonly repository: IntegrationEventsRepository,
  ) {}

  async list(dto: ListIntegrationEventsDto) {
    const result = await this.repository.list({
      status: dto.status,
      source: dto.source,
      eventType: dto.eventType,
      from: dto.from,
      to: dto.to,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    });
    return createApiResponse(result);
  }

  async getSummary() {
    const result = await this.repository.getSummary();
    return createApiResponse(result);
  }

  async getSyncHealth() {
    const result = await this.repository.getSyncHealth();
    return createApiResponse(result);
  }
}
