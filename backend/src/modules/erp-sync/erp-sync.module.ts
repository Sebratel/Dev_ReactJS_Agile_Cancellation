import { Module } from '@nestjs/common';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';
import { RecoveryNotifierService } from '@/modules/erp-sync/recovery-notifier.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [WebhooksModule, NotificationsModule],
  providers: [ErpSyncService, RecoveryNotifierService],
})
export class ErpSyncModule {}
