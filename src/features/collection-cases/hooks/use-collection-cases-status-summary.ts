import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getCollectionCasesStatusSummary } from '@/features/collection-cases/services/collection-cases.service';

export function useCollectionCasesStatusSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.collectionCases.statusSummary,
    queryFn: getCollectionCasesStatusSummary,
    enabled,
  });
}
