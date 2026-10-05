import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getRenegotiatedHistory } from '@/features/collection-cases/services/collection-cases.service';

export function useRenegotiatedHistory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.collectionCases.renegotiatedHistory,
    queryFn: getRenegotiatedHistory,
    enabled,
  });
}
