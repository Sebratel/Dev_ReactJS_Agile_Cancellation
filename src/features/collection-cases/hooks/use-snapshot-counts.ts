import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';

// Contadores do resumo da carteira sobre TODOS os casos que batem com os
// filtros da lista (e não só os da página aberta). Cada contador é uma consulta
// leve (limit 1) que só lê o total. Quando um filtro ativo já contradiz o
// contador (ex.: carteira de um atendente x "sem responsável"), o valor é 0.
export function useSnapshotCounts(base: CollectionCasesListParams) {
  const shared: CollectionCasesListParams = {
    ...base,
    page: 1,
    limit: 1,
    sortBy: undefined,
    sortDirection: undefined,
  };

  const unassignedConflicts =
    Boolean(base.assignedToId) && base.assignedToId !== 'unassigned';
  const noResponseConflicts =
    Boolean(base.status) && base.status !== 'NO_RESPONSE';
  const slaConflicts = Boolean(base.slaStatus) && base.slaStatus !== 'overdue';

  const unassigned = useCollectionCases(
    { ...shared, assignedToId: 'unassigned' },
    { enabled: !unassignedConflicts },
  );
  const noResponse = useCollectionCases(
    { ...shared, status: 'NO_RESPONSE' },
    { enabled: !noResponseConflicts },
  );
  const overdueSla = useCollectionCases(
    { ...shared, slaStatus: 'overdue' },
    { enabled: !slaConflicts },
  );

  return {
    notAssigned: unassignedConflicts ? 0 : unassigned.data?.pagination.total,
    noResponse: noResponseConflicts ? 0 : noResponse.data?.pagination.total,
    overdueSla: slaConflicts ? 0 : overdueSla.data?.pagination.total,
  };
}
