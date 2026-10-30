import { Module } from '@nestjs/common';
import { HsmDeliverySyncService } from '@/modules/hsm-delivery/hsm-delivery-sync.service';

@Module({
  providers: [HsmDeliverySyncService],
})
export class HsmDeliveryModule {}
