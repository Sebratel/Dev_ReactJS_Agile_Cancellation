import { useQuery } from '@tanstack/react-query';
import { getRecoveryRanking } from '@/features/ranking/services/ranking.service';
import { type RecoveryRankingPeriod } from '@/features/ranking/types/ranking-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useRecoveryRanking(
  period: RecoveryRankingPeriod,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.dashboard.recoveryRanking(period),
    queryFn: () => getRecoveryRanking(period),
    enabled: options.enabled ?? true,
  });
}
