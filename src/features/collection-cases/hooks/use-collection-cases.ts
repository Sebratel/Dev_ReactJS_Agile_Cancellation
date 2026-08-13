import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import {
  getCollectionCaseById,
  getCollectionCases,
} from '@/features/collection-cases/services/collection-cases.service';
import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';

type UseCollectionCasesOptions = {
  enabled?: boolean;
};

export function useCollectionCases(
  params: CollectionCasesListParams,
  options: UseCollectionCasesOptions = {},
) {
  const queryParams: CollectionCasesListParams = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
    status: params.status,
    priority: params.priority,
    assignedToId: params.assignedToId,
    search: params.search,
    daysOverdueMin: params.daysOverdueMin,
    daysOverdueMax: params.daysOverdueMax,
    totalOutstandingMin: params.totalOutstandingMin,
    totalOutstandingMax: params.totalOutstandingMax,
    slaStatus: params.slaStatus,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  };

  return useQuery({
    queryKey: queryKeys.collectionCases.list(queryParams),
    queryFn: () => getCollectionCases(queryParams),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useCollectionCase(caseId: string) {
  return useQuery({
    queryKey: queryKeys.collectionCases.detail(caseId),
    queryFn: () => getCollectionCaseById(caseId),
    enabled: caseId.length > 0,
  });
}
