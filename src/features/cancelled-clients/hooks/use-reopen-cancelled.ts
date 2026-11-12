import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { reopenCancelledCases } from '@/features/collection-cases/services/collection-cases.service';
import { type ReopenCancelledPayload } from '@/features/collection-cases/types/collection-cases-api.types';

// Supervisão devolve clientes cancelados a uma carteira (novo ciclo de contato).
export function useReopenCancelled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReopenCancelledPayload) =>
      reopenCancelledCases(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collectionCases.all,
      });
    },
  });
}
