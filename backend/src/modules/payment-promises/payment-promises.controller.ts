import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ListPaymentPromisesDto } from '@/modules/payment-promises/dto/list-payment-promises.dto';
import { PaymentPromisesService } from '@/modules/payment-promises/payment-promises.service';

@Controller('payment-promises')
export class PaymentPromisesController {
  constructor(private readonly service: PaymentPromisesService) {}

  @Roles('ADMIN', 'SUPERVISOR', 'CANCELLATION_AGENT', 'FINANCE')
  @Get()
  list(@Query() query: ListPaymentPromisesDto) {
    return this.service.list(query);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'CANCELLATION_AGENT', 'FINANCE')
  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}
