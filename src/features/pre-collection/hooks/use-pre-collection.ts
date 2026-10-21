import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import {
  distributePreCollection,
  getPreCollection,
} from '@/features/pre-collection/services/pre-collection.service';

export function usePreCollection(daysWindow: number) {
  return useQuery({
    queryKey: queryKeys.preCollection.list(daysWindow),
    queryFn: () => getPreCollection(daysWindow),
    placeholderData: keepPreviousData,
    // Enquanto o snapshot em cache do backend estiver sendo montado, refazemos
    // a busca com mais frequencia para pegar os dados assim que ficarem prontos.
    refetchInterval: (query) =>
      query.state.data?.refreshing ? 5_000 : 60_000,
  });
}

export function useDistributePreCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: distributePreCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.collectionCases.all });
    },
  });
}
