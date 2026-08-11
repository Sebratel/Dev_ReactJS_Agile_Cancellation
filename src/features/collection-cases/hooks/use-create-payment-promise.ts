import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPaymentPromise } from '@/features/collection-cases/services/collection-cases.service';
import { type CreatePaymentPromisePayload } from '@/features/collection-cases/types/collection-cases-api.types';
import { queryKeys } from '@/services/api/query-keys';

export function useCreatePaymentPromise(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePaymentPromisePayload) =>
      createPaymentPromise(caseId, payload),
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
