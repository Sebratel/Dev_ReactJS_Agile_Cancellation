import { useQuery } from '@tanstack/react-query';
import {
  getIntegrationEvents,
  getIntegrationEventsSummary,
  getSyncHealth,
} from '@/features/integrations/services/integration-events.service';
import { type IntegrationEventsListParams } from '@/features/integrations/types/integration-events-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useIntegrationEvents(
  params?: IntegrationEventsListParams & { enabled?: boolean },
) {
  const { enabled = true, ...queryParams } = params ?? {};
  return useQuery({
    queryKey: queryKeys.integrations.events.list(queryParams),
    queryFn: () => getIntegrationEvents(queryParams),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useIntegrationEventsSummary() {
  return useQuery({
    queryKey: queryKeys.integrations.events.summary,
    queryFn: getIntegrationEventsSummary,
    refetchInterval: 30_000,
  });
}

export function useSyncHealth(enabled = true) {
  return useQuery({
    queryKey: queryKeys.integrations.events.syncHealth,
    queryFn: getSyncHealth,
    enabled,
    refetchInterval: 60_000,
  });
}
