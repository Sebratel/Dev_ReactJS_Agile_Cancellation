import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { autoRefreshOptions } from '@/services/api/auto-refresh';
import { getCollectionCasesIntakeSummary } from '@/features/collection-cases/services/collection-cases.service';

export function useCollectionCasesIntakeSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.collectionCases.intakeSummary,
    queryFn: getCollectionCasesIntakeSummary,
    enabled,
    ...autoRefreshOptions,
  });
}
