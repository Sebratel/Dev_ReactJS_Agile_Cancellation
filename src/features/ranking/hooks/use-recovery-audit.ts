import { useQuery } from '@tanstack/react-query';
import { getRecoveryAudit } from '@/features/ranking/services/ranking.service';
import { type RecoveryRankingPeriod } from '@/features/ranking/types/ranking-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useRecoveryAudit(
  userId: string | null,
  period: RecoveryRankingPeriod,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.recoveryAudit(userId ?? '', period),
    queryFn: () => getRecoveryAudit(userId as string, period),
    enabled: Boolean(userId),
  });
}
