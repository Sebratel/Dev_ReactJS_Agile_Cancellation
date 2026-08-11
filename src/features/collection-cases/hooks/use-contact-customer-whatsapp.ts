import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contactCustomerByWhatsApp } from '@/features/collection-cases/services/collection-cases.service';
import { queryKeys } from '@/services/api/query-keys';

export function useContactCustomerWhatsApp(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => contactCustomerByWhatsApp(caseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.collectionCases.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collectionCases.detail(caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collectionCases.timeline(caseId),
        }),
      ]);
    },
  });
}
