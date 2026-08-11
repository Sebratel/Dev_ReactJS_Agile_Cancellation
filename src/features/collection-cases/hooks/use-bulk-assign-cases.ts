import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkAssignCases } from '@/features/collection-cases/services/collection-cases.service';
import { queryKeys } from '@/services/api/query-keys';

export function useBulkAssignCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkAssignCases,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collectionCases.all,
      });
    },
  });
}
