import { httpClient } from '@/services/api/http-client';
import type {
  PaymentPromiseListItemResponse,
  PaymentPromisesListParams,
  PaymentPromisesSummaryResponse,
} from '@/features/payment-promises/types/payment-promises-api.types';
import type { PaginatedResponse } from '@/services/api/types/api-envelope';

export function buildPaymentPromisesPath(
  params?: PaymentPromisesListParams,
): string {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.caseSituation) query.set('caseSituation', params.caseSituation);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.assignedUserId)
    query.set('assignedUserId', params.assignedUserId);
  if (params?.search?.trim()) query.set('search', params.search.trim());
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return qs ? `/payment-promises?${qs}` : '/payment-promises';
}

export async function getPaymentPromises(
  params?: PaymentPromisesListParams,
): Promise<PaginatedResponse<PaymentPromiseListItemResponse>> {
  const { data } = await httpClient.request<
    PaginatedResponse<PaymentPromiseListItemResponse>
  >({ path: buildPaymentPromisesPath(params), method: 'GET' });
  return data;
}

export async function getPaymentPromisesSummary(): Promise<PaymentPromisesSummaryResponse> {
  const { data } = await httpClient.request<PaymentPromisesSummaryResponse>({
    path: '/payment-promises/summary',
    method: 'GET',
  });
  return data;
}
