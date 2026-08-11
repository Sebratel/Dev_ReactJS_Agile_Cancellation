import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getDashboardOperations } from '@/features/dashboard/services/dashboard.service';

export function useDashboardOperations() {
  return useQuery({
    queryKey: queryKeys.dashboard.operations,
    queryFn: getDashboardOperations,
  });
}
