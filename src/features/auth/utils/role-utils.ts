import { type UserRole } from '@/types/auth';

const rolePriority: UserRole[] = [
  'ADMIN',
  'SUPERVISOR',
  'FINANCE',
  'COLLECTION_AGENT',
  'CANCELLATION_AGENT',
  'VIEWER',
];

export function resolvePrimaryRole(roles: UserRole[]): UserRole {
  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return roles[0] ?? 'VIEWER';
}

export function hasAnyRole(
  userRoles: UserRole[],
  allowedRoles: UserRole[],
): boolean {
  return allowedRoles.some((role) => userRoles.includes(role));
}
