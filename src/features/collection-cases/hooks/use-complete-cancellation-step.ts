import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeCancellationStep } from '@/features/cancellations/services/cancellations.service';
import type { CompleteCancellationStepPayload } from '@/features/cancellations/types/cancellations-api.types';
import { queryKeys } from '@/services/api/query-keys';

type CompleteCancellationStepVariables = {
  cancellationId: string;
  stepCode: string;
  payload: CompleteCancellationStepPayload;
};

export function useCompleteCancellationStep(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cancellationId,
      stepCode,
      payload,
    }: CompleteCancellationStepVariables) =>
      completeCancellationStep(cancellationId, stepCode, payload),
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
      ]);
    },
  });
}
