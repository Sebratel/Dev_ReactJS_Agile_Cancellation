import { Module } from '@nestjs/common';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';

@Module({
  imports: [WebhooksModule],
  providers: [ErpSyncService],
})
export class ErpSyncModule {}
