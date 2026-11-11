import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  creditCaseManually,
  type ManualCreditPayload,
} from '@/features/ranking/services/manual-credit.service';
import { queryKeys } from '@/services/api/query-keys';

export function useManualCredit(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ManualCreditPayload) =>
      creditCaseManually(caseId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.collectionCases.detail(caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collectionCases.timeline(caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collectionCases.all,
        }),
        // Ranking e conferência passam a refletir a receita atribuída.
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.recoveryRankingAll,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.caseRecoveryAudit(caseId),
        }),
      ]);
    },
  });
}
