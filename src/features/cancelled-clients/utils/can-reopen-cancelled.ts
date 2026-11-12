import { type CollectionCaseListItemResponse } from '@/features/collection-cases/types/collection-cases-api.types';

// Só encerrados (sem carteira) podem ser devolvidos a uma carteira.
export function canReopenCancelled(item: CollectionCaseListItemResponse) {
  return item.status === 'CLOSED';
}
