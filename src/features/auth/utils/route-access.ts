import { appRoutes, type AppRouteItem } from '@/app/router/route-config';
import { type UserRole } from '@/types/auth';

export function getRoutesForRole(role: UserRole): AppRouteItem[] {
  return getRoutesForRoles([role]);
}

// Quem acumula papéis (ex.: cobrança + cancelamento) vê as telas de todos eles.
export function getRoutesForRoles(roles: UserRole[]): AppRouteItem[] {
  return appRoutes.filter(
    (route) =>
      route.ready && route.allowedRoles.some((role) => roles.includes(role)),
  );
}
