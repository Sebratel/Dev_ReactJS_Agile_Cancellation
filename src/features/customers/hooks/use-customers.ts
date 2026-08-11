import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import {
  getCustomerById,
  getCustomers,
} from '@/features/customers/services/customers.service';
import { type CustomersListParams } from '@/features/customers/types/customers-api.types';

export function useCustomers(params: CustomersListParams) {
  const queryParams: CustomersListParams = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  };

  return useQuery({
    queryKey: queryKeys.customers.list(queryParams),
    queryFn: () => getCustomers(queryParams),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => getCustomerById(id),
    enabled: id.length > 0,
  });
}
