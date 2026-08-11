import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { WebhooksMockRepository } from '@/modules/webhooks/repositories/webhooks-mock.repository';
import type { WebhooksPrismaRepository } from '@/modules/webhooks/repositories/webhooks-prisma.repository';
import type { WebhooksRepository } from '@/modules/webhooks/repositories/webhooks.repository';

export function createWebhooksRepository(
  mockRepository: WebhooksMockRepository,
  prismaRepository: WebhooksPrismaRepository,
): WebhooksRepository {
  return getDataSourceMode() === 'database' ? prismaRepository : mockRepository;
}
