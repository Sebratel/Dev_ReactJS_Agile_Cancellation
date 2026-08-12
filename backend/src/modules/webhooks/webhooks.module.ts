import { Module } from '@nestjs/common';
import { WebhookAuthGuard } from '@/modules/webhooks/guards/webhook-auth.guard';
import { WebhooksController } from '@/modules/webhooks/webhooks.controller';
import { WebhooksService } from '@/modules/webhooks/webhooks.service';
import { WebhooksMockRepository } from '@/modules/webhooks/repositories/webhooks-mock.repository';
import { WebhooksPrismaRepository } from '@/modules/webhooks/repositories/webhooks-prisma.repository';
import { webhooksRepositoryProvider } from '@/modules/webhooks/repositories/webhooks.repository.provider';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookAuthGuard,
    WebhooksMockRepository,
    WebhooksPrismaRepository,
    webhooksRepositoryProvider,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
