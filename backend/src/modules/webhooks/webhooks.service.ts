import { Inject, Injectable } from '@nestjs/common';
import { WEBHOOKS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createApiResponse } from '@/common/responses/api-response';
import type { IngestCollectionCasesDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import type { MatrixReplyDto } from '@/modules/webhooks/dto/matrix-reply.dto';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import type { WebhooksRepository } from '@/modules/webhooks/repositories/webhooks.repository';

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(WEBHOOKS_REPOSITORY)
    private readonly webhooksRepository: WebhooksRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async ingestCollectionCases(dto: IngestCollectionCasesDto) {
    const source = dto.source?.trim() || 'n8n';
    const summary = await this.webhooksRepository.ingestCollectionBatch(
      source,
      dto.events,
    );

    return createApiResponse(summary);
  }

  async recordMatrixReply(dto: MatrixReplyDto) {
    const result = await this.webhooksRepository.recordMatrixReply(dto);

    if (result.outcome === 'success' && result.assignedUserId) {
      await this.notificationsService.notify({
        userId: result.assignedUserId,
        type: 'MATRIX_REPLY',
        title: 'Cliente respondeu no WhatsApp',
        body: `${result.customerName} respondeu a mensagem Matrix.`,
        entityType: 'COLLECTION_CASE',
        entityId: result.caseId,
      });
    }

    return createApiResponse(result);
  }
}
