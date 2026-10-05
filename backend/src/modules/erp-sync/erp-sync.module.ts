import { Module } from '@nestjs/common';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';
import { ErpSyncController } from '@/modules/erp-sync/erp-sync.controller';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';
import { RecoveryNotifierService } from '@/modules/erp-sync/recovery-notifier.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [WebhooksModule, NotificationsModule],
  controllers: [ErpSyncController],
  providers: [ErpSyncService, RecoveryNotifierService],
})
export class ErpSyncModule {}
