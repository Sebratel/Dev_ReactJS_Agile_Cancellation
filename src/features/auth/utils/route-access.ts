import { appRoutes, type AppRouteItem } from '@/app/router/route-config';
import { type UserRole } from '@/types/auth';

export function getRoutesForRole(role: UserRole): AppRouteItem[] {
  return appRoutes.filter(
    (route) => route.ready && route.allowedRoles.includes(role),
  );
}
