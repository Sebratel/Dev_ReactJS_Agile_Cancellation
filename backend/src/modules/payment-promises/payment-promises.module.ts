import { Module } from '@nestjs/common';
import { PaymentPromisesController } from '@/modules/payment-promises/payment-promises.controller';
import { PaymentPromisesService } from '@/modules/payment-promises/payment-promises.service';
import { PaymentPromisesPrismaRepository } from '@/modules/payment-promises/repositories/payment-promises-prisma.repository';
import { PAYMENT_PROMISES_REPOSITORY } from '@/modules/payment-promises/repositories/payment-promises.repository';

@Module({
  controllers: [PaymentPromisesController],
  providers: [
    PaymentPromisesService,
    {
      provide: PAYMENT_PROMISES_REPOSITORY,
      useClass: PaymentPromisesPrismaRepository,
    },
  ],
})
export class PaymentPromisesModule {}
