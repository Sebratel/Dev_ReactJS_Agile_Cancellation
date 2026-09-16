import { useQuery } from '@tanstack/react-query';
import { getSettings } from '@/features/settings/services/settings.service';
import { queryKeys } from '@/services/api/query-keys';

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: getSettings,
    staleTime: 60_000,
  });
}
