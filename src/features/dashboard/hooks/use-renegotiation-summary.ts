import { useQuery } from '@tanstack/react-query';
import { getRenegotiationSummary } from '@/features/collection-cases/services/collection-cases.service';
import { autoRefreshOptions } from '@/services/api/auto-refresh';
import { queryKeys } from '@/services/api/query-keys';

// Card "Renegociados em aberto": mesma fonte da aba Renegociados (ERP).
export function useRenegotiationSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.renegotiationSummary,
    queryFn: getRenegotiationSummary,
    enabled,
    ...autoRefreshOptions,
  });
}
