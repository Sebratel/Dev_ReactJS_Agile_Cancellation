import { useMutation, useQueryClient } from '@tanstack/react-query';
import { autoDistribute } from '@/features/collection-cases/services/collection-cases.service';
import { queryKeys } from '@/services/api/query-keys';

export function useAutoDistribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoDistribute,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collectionCases.all,
      });
    },
  });
}
