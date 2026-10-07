import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getCancellationReasons } from '@/features/dashboard/services/dashboard.service';

export function useCancellationReasons() {
  return useQuery({
    queryKey: queryKeys.dashboard.cancellationReasons,
    queryFn: getCancellationReasons,
  });
}
