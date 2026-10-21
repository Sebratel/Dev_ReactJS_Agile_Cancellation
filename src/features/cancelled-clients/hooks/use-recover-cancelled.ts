import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { recoverCancelledCase } from '@/features/collection-cases/services/collection-cases.service';

export function useRecoverCancelled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (caseId: string) => recoverCancelledCase(caseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collectionCases.all,
      });
    },
  });
}
