import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import type {
  PaymentPromiseListItemResponse,
  PaymentPromisesSummaryResponse,
} from '@/modules/payment-promises/dto/payment-promise-list-item.response';

export type ListPaymentPromisesParams = {
  status?: string;
  from?: string;
  to?: string;
  assignedUserId?: string;
  caseSituation?: string;
  search?: string;
  page: number;
  limit: number;
};

export interface PaymentPromisesRepository {
  list(
    params: ListPaymentPromisesParams,
  ): Promise<PaginatedResponse<PaymentPromiseListItemResponse>>;
  getSummary(): Promise<PaymentPromisesSummaryResponse>;
}

export const PAYMENT_PROMISES_REPOSITORY = 'PAYMENT_PROMISES_REPOSITORY';
