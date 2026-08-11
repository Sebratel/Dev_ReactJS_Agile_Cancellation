import type { Provider } from '@nestjs/common';
import { WEBHOOKS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createWebhooksRepository } from '@/modules/webhooks/repositories/webhooks.repository.factory';
import { WebhooksMockRepository } from '@/modules/webhooks/repositories/webhooks-mock.repository';
import { WebhooksPrismaRepository } from '@/modules/webhooks/repositories/webhooks-prisma.repository';

export const webhooksRepositoryProvider: Provider = {
  provide: WEBHOOKS_REPOSITORY,
  useFactory: createWebhooksRepository,
  inject: [WebhooksMockRepository, WebhooksPrismaRepository],
};
