import { Inject, Injectable } from '@nestjs/common';
import { WEBHOOKS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createApiResponse } from '@/common/responses/api-response';
import type { IngestCollectionCasesDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import type { WebhooksRepository } from '@/modules/webhooks/repositories/webhooks.repository';

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(WEBHOOKS_REPOSITORY)
    private readonly webhooksRepository: WebhooksRepository,
  ) {}

  async ingestCollectionCases(dto: IngestCollectionCasesDto) {
    const source = dto.source?.trim() || 'n8n';
    const summary = await this.webhooksRepository.ingestCollectionBatch(
      source,
      dto.events,
    );

    return createApiResponse(summary);
  }
}
