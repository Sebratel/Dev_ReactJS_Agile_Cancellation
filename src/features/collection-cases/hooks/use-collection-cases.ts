import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { autoRefreshOptions } from '@/services/api/auto-refresh';
import {
  getCollectionCaseById,
  getCollectionCases,
} from '@/features/collection-cases/services/collection-cases.service';
import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';

type UseCollectionCasesOptions = {
  enabled?: boolean;
  // Revalida sozinho a cada 60s (aba visivel) e ao voltar o foco — telas de
  // supervisao/carteira.
  autoRefresh?: boolean;
};

export function useCollectionCases(
  params: CollectionCasesListParams,
  options: UseCollectionCasesOptions = {},
) {
  // Espalha todos os params recebidos (em vez de listar campo a campo) para
  // que um filtro novo adicionado a CollectionCasesListParams chegue aqui
  // automaticamente. A lista manual anterior ja tinha ficado desatualizada
  // por duas vezes — faltavam contractStatus, firstDueDate, secondDueDate,
  // createdToday, interactionStatus e promiseStatus, que por isso nunca
  // chegavam a API: o filtro parecia nao fazer nada, sempre retornando o
  // mesmo resultado padrao (ordenado por dias em atraso).
  const queryParams: CollectionCasesListParams = {
    ...params,
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  };

  return useQuery({
    queryKey: queryKeys.collectionCases.list(queryParams),
    queryFn: () => getCollectionCases(queryParams),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    ...(options.autoRefresh ? autoRefreshOptions : {}),
  });
}

export function useCollectionCase(caseId: string) {
  return useQuery({
    queryKey: queryKeys.collectionCases.detail(caseId),
    queryFn: () => getCollectionCaseById(caseId),
    enabled: caseId.length > 0,
  });
}
