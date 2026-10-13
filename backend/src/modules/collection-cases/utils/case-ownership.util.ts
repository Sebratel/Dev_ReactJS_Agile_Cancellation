import { HttpStatus } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';

// Perfis que agem em qualquer caso. Os demais (COLLECTION_AGENT /
// CANCELLATION_AGENT) so agem em casos atribuidos a eles.
const UNRESTRICTED_ROLES = ['ADMIN', 'SUPERVISOR', 'FINANCE'];

export const CASE_NOT_OWNED_MESSAGE =
  'Você só pode atuar em casos atribuídos a você.';

export function isRestrictedToOwnCases(user: AuthenticatedUser): boolean {
  return !user.roles.some((role) => UNRESTRICTED_ROLES.includes(role));
}

/**
 * Autorizacao de ESCRITA por dono do caso (a leitura segue em
 * restrictToOwnCasesIfAgent). Lanca 403 quando um atendente tenta agir em caso
 * de outro atendente ou sem responsavel. Dono nao informado (`undefined`) e
 * tratado como NEGADO para perfis restritos (fail-closed).
 */
export function assertCanActOnCase(
  user: AuthenticatedUser | undefined,
  assignedUserId: string | null | undefined,
): void {
  if (!user || !isRestrictedToOwnCases(user)) {
    return;
  }

  if (assignedUserId == null || assignedUserId !== user.id) {
    throw new AppException(CASE_NOT_OWNED_MESSAGE, HttpStatus.FORBIDDEN);
  }
}
