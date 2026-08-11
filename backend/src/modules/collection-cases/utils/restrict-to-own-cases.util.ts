import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import type { CollectionCasesListParams } from '@/modules/collection-cases/repositories/collection-cases.repository';

/**
 * Um COLLECTION_AGENT so pode listar/exportar os proprios casos. Se o
 * usuario nao tiver ADMIN, SUPERVISOR ou CANCELLATION_AGENT (que usam este
 * mesmo endpoint para a esteira de cancelamento), forcamos assignedToId
 * para o proprio id, ignorando qualquer valor enviado na query — isso
 * impede que um agente contorne a restricao de UI chamando a API
 * diretamente para ver a carteira completa de outros colegas.
 */
export function restrictToOwnCasesIfAgent(
  params: CollectionCasesListParams,
  user: AuthenticatedUser,
): CollectionCasesListParams {
  const canSeeFullPortfolio = user.roles.some(
    (role) =>
      role === 'ADMIN' || role === 'SUPERVISOR' || role === 'CANCELLATION_AGENT',
  );

  if (canSeeFullPortfolio) {
    return params;
  }

  return { ...params, assignedToId: user.id };
}
