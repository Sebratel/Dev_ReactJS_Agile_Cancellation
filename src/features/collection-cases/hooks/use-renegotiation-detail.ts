import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { getRenegotiationDetail } from '@/features/collection-cases/services/collection-cases.service';

export function useRenegotiationDetail(
  contractExternalId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.collectionCases.renegotiationDetail(
      contractExternalId ?? '',
    ),
    queryFn: () => getRenegotiationDetail(contractExternalId ?? ''),
    enabled: enabled && Boolean(contractExternalId),
    staleTime: 60_000,
  });
}
