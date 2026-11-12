import { Inject, Injectable } from '@nestjs/common';
import { createApiResponse } from '@/common/responses/api-response';
import type { ListPaymentPromisesDto } from '@/modules/payment-promises/dto/list-payment-promises.dto';
import {
  PAYMENT_PROMISES_REPOSITORY,
  type PaymentPromisesRepository,
} from '@/modules/payment-promises/repositories/payment-promises.repository';

@Injectable()
export class PaymentPromisesService {
  constructor(
    @Inject(PAYMENT_PROMISES_REPOSITORY)
    private readonly repository: PaymentPromisesRepository,
  ) {}

  async list(dto: ListPaymentPromisesDto) {
    const result = await this.repository.list({
      status: dto.status,
      from: dto.from,
      to: dto.to,
      assignedUserId: dto.assignedUserId,
      caseSituation: dto.caseSituation,
      search: dto.search?.trim() || undefined,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    });
    return createApiResponse(result);
  }

  async getSummary() {
    const result = await this.repository.getSummary();
    return createApiResponse(result);
  }
}
