import { useQuery } from '@tanstack/react-query';
import { getCaseRecoveryAudit } from '@/features/ranking/services/ranking.service';
import { queryKeys } from '@/services/api/query-keys';

export function useCaseRecoveryAudit(
  caseId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.caseRecoveryAudit(caseId ?? ''),
    queryFn: () => getCaseRecoveryAudit(caseId as string),
    enabled: enabled && Boolean(caseId),
  });
}
