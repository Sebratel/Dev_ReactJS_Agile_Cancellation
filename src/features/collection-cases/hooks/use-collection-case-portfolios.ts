import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { autoRefreshOptions } from '@/services/api/auto-refresh';
import { getCollectionCasePortfolios } from '@/features/collection-cases/services/collection-cases.service';

export function useCollectionCasePortfolios(enabled = true) {
  return useQuery({
    queryKey: queryKeys.collectionCases.portfolios,
    queryFn: getCollectionCasePortfolios,
    enabled,
    ...autoRefreshOptions,
  });
}
