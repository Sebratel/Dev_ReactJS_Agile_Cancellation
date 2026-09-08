import { Module } from '@nestjs/common';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [WebhooksModule, NotificationsModule],
  providers: [ErpSyncService],
})
export class ErpSyncModule {}
