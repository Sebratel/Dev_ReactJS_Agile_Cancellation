import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import type { CollectionCasesListParams } from '@/modules/collection-cases/repositories/collection-cases.repository';

/**
 * Agentes operacionais so podem listar/exportar os proprios casos. Apenas
 * ADMIN e SUPERVISOR enxergam a carteira completa; isso tambem vale para a
 * esteira de cancelamento, que reutiliza este endpoint.
 */
export function restrictToOwnCasesIfAgent(
  params: CollectionCasesListParams,
  user: AuthenticatedUser,
): CollectionCasesListParams {
  const canSeeFullPortfolio = user.roles.some(
    (role) => role === 'ADMIN' || role === 'SUPERVISOR',
  );

  if (canSeeFullPortfolio) {
    return params;
  }

  return { ...params, assignedToId: user.id };
}
