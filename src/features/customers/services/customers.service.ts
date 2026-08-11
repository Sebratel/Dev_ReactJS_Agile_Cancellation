import { httpClient } from '@/services/api/http-client';
import { type PaginatedResponse } from '@/services/api/types/api-envelope';
import {
  type CustomerDetailsResponse,
  type CustomerListItemResponse,
  type CustomersListParams,
} from '@/features/customers/types/customers-api.types';

function buildCustomersPath(params: CustomersListParams) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('limit', String(params.limit ?? 20));

  if (params.search && params.search.trim() !== '') {
    searchParams.set('search', params.search.trim());
  }

  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
    searchParams.set('sortDirection', params.sortDirection ?? 'asc');
  }

  return `/customers?${searchParams.toString()}`;
}

export async function getCustomers(params: CustomersListParams = {}) {
  const response = await httpClient.request<
    PaginatedResponse<CustomerListItemResponse>
  >({
    path: buildCustomersPath(params),
  });

  return response.data;
}

export async function getCustomerById(id: string) {
  const response = await httpClient.request<CustomerDetailsResponse>({
    path: `/customers/${id}`,
  });

  return response.data;
}

export { buildCustomersPath };
