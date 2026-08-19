import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getOverdueDateSummary } from '@/features/collection-cases/services/collection-cases.service';
import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';

type UseOverdueDateSummaryOptions = {
  enabled?: boolean;
};

// Alimenta o popover "casos por data" ao lado dos campos de 1o/2o
// vencimento. So habilitado sob demanda (ao abrir o popover) para nao gerar
// uma chamada extra a cada tela carregada.
export function useOverdueDateSummary(
  params: CollectionCasesListParams,
  options: UseOverdueDateSummaryOptions = {},
) {
  const queryParams: CollectionCasesListParams = {
    ...params,
    page: undefined,
    limit: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  };

  return useQuery({
    queryKey: queryKeys.collectionCases.overdueDateSummary(queryParams),
    queryFn: () => getOverdueDateSummary(queryParams),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}
