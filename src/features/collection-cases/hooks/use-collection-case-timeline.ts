import { useQuery } from '@tanstack/react-query';
import { getCollectionCaseTimeline } from '@/features/collection-cases/services/collection-cases.service';
import { queryKeys } from '@/services/api/query-keys';

export function useCollectionCaseTimeline(caseId: string) {
  return useQuery({
    queryKey: queryKeys.collectionCases.timeline(caseId),
    queryFn: () => getCollectionCaseTimeline(caseId),
    enabled: caseId.length > 0,
  });
}
