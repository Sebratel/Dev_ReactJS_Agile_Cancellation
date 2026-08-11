import { useQuery } from '@tanstack/react-query';
import { getElevenIntegrationStatus } from '@/features/integrations/services/integrations.service';
import { queryKeys } from '@/services/api/query-keys';

export function useElevenIntegrationStatus() {
  return useQuery({
    queryKey: queryKeys.integrations.elevenStatus,
    queryFn: getElevenIntegrationStatus,
    staleTime: 60_000,
  });
}
