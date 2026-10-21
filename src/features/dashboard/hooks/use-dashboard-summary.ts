import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { autoRefreshOptions } from '@/services/api/auto-refresh';
import { getDashboardSummary } from '@/features/dashboard/services/dashboard.service';

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: getDashboardSummary,
    ...autoRefreshOptions,
  });
}
