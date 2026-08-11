export const ROLE_CODES = [
  'ADMIN',
  'SUPERVISOR',
  'FINANCE',
  'COLLECTION_AGENT',
  'CANCELLATION_AGENT',
  'VIEWER',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export function isRoleCode(value: string): value is RoleCode {
  return ROLE_CODES.includes(value as RoleCode);
}
