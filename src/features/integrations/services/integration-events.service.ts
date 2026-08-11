import { httpClient } from '@/services/api/http-client';
import type {
  IntegrationEventListItemResponse,
  IntegrationEventsListParams,
  IntegrationEventsSummaryResponse,
} from '@/features/integrations/types/integration-events-api.types';
import type { PaginatedResponse } from '@/services/api/types/api-envelope';

function buildPath(params?: IntegrationEventsListParams): string {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.source) q.set('source', params.source);
  if (params?.eventType) q.set('eventType', params.eventType);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return qs ? `/integration-events?${qs}` : '/integration-events';
}

export async function getIntegrationEvents(
  params?: IntegrationEventsListParams,
): Promise<PaginatedResponse<IntegrationEventListItemResponse>> {
  const { data } = await httpClient.request<
    PaginatedResponse<IntegrationEventListItemResponse>
  >({ path: buildPath(params), method: 'GET' });
  return data;
}

export async function getIntegrationEventsSummary(): Promise<IntegrationEventsSummaryResponse> {
  const { data } = await httpClient.request<IntegrationEventsSummaryResponse>({
    path: '/integration-events/summary',
    method: 'GET',
  });
  return data;
}
