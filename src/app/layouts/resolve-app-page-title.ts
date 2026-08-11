import { appRoutes } from '@/app/router/route-config';

export function resolveAppPageTitle(pathname: string): string {
  if (
    pathname.startsWith('/supervisao/') &&
    pathname.length > '/supervisao/'.length
  ) {
    return 'Detalhe do caso';
  }

  const exactRoute = appRoutes.find((route) => route.path === pathname);

  if (exactRoute) {
    return exactRoute.label;
  }

  const prefixRoute = appRoutes.find(
    (route) => route.path !== '/' && pathname.startsWith(`${route.path}/`),
  );

  return prefixRoute?.label ?? 'GER';
}
