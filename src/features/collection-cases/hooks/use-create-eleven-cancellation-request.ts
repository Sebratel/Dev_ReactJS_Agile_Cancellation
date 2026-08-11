import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createElevenCancellationRequest } from '@/features/cancellations/services/cancellations.service';
import type { CreateElevenCancellationRequestPayload } from '@/features/cancellations/types/cancellations-api.types';
import { queryKeys } from '@/services/api/query-keys';

type CreateElevenCancellationRequestVariables = {
  cancellationId: string;
  payload: CreateElevenCancellationRequestPayload;
};

export function useCreateElevenCancellationRequest(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cancellationId,
      payload,
    }: CreateElevenCancellationRequestVariables) =>
      createElevenCancellationRequest(cancellationId, payload),
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
