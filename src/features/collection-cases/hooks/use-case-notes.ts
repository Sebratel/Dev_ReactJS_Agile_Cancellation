import { useQuery } from '@tanstack/react-query';
import { getCaseNotes } from '@/features/collection-cases/services/case-notes.service';
import { queryKeys } from '@/services/api/query-keys';

export function useCaseNotes(caseId: string) {
  return useQuery({
    queryKey: queryKeys.collectionCases.notes(caseId),
    queryFn: () => getCaseNotes(caseId),
    enabled: Boolean(caseId),
  });
}
