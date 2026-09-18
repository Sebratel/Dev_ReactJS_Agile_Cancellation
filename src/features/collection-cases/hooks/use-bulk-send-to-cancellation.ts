import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkSendToCancellation } from '@/features/collection-cases/services/collection-cases.service';
import { queryKeys } from '@/services/api/query-keys';

export function useBulkSendToCancellation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkSendToCancellation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collectionCases.all,
      });
    },
  });
}
