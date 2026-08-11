import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import type {
  CustomerDetailsResponse,
  CustomerListItemResponse,
} from '@/modules/customers/dto/customer.response';
import type {
  CustomersSortBy,
  CustomersSortDirection,
} from '@/modules/customers/dto/customers-query.dto';

export type CustomersListParams = {
  page: number;
  limit: number;
  search?: string;
  sortBy?: CustomersSortBy;
  sortDirection?: CustomersSortDirection;
};

export interface CustomersRepository {
  listCustomers(
    params: CustomersListParams,
  ): Promise<PaginatedResponse<CustomerListItemResponse>>;

  getCustomerById(id: string): Promise<CustomerDetailsResponse | null>;
}

const OPEN_INVOICE_STATUSES = ['OPEN', 'OVERDUE', 'PARTIALLY_PAID'];

export function isOpenInvoiceStatus(status: string): boolean {
  return OPEN_INVOICE_STATUSES.includes(status);
}

/**
 * Uma fatura em aberto e considerada vencida quando o status ja e OVERDUE
 * ou quando o vencimento ja passou, independente do status ainda nao ter
 * sido atualizado (ex: OPEN com dueDate no passado).
 */
export function isOverdueInvoice(status: string, dueDate: Date): boolean {
  return status === 'OVERDUE' || dueDate.getTime() < Date.now();
}
