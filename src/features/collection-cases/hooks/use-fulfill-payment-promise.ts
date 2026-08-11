import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fulfillPaymentPromise } from '@/features/collection-cases/services/collection-cases.service';
import { type UpdatePaymentPromiseStatusPayload } from '@/features/collection-cases/types/collection-cases-api.types';
import { queryKeys } from '@/services/api/query-keys';

type FulfillPaymentPromiseVariables = UpdatePaymentPromiseStatusPayload & {
  promiseId: string;
};

export function useFulfillPaymentPromise(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ promiseId, notes }: FulfillPaymentPromiseVariables) =>
      fulfillPaymentPromise(caseId, promiseId, notes ? { notes } : {}),
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
