import { Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/app-layout';
import { ProtectedRoute } from '@/features/auth/guards/protected-route';
import { PublicRoute } from '@/features/auth/guards/public-route';
import { RoleGuard } from '@/features/auth/guards/role-guard';
import {
  LazyBacklogPage,
  LazyCancellationsPage,
  LazyCollectionCaseDetailPage,
  LazyCustomerDetailPage,
  LazyCustomersPage,
  LazyDashboardPage,
  LazyForbiddenPage,
  LazyLoginPage,
  LazyAuditoriaPage,
  LazyMyCollectionPage,
  LazyPaymentPromisesPage,
  LazyRankingPage,
  LazyReportsPage,
  LazySettingsPage,
  LazySupervisionPage,
  LazyUsersPage,
} from '@/app/router/lazy-pages';
import { RouteFallback } from '@/app/router/route-fallback';

function withRouteFallback(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const appRouter = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: withRouteFallback(<LazyLoginPage />),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          {
            path: 'dashboard',
            element: withRouteFallback(<LazyDashboardPage />),
          },
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR']} />,
            children: [
              {
                path: 'supervisao',
                element: withRouteFallback(<LazySupervisionPage />),
              },
              {
                path: 'supervisao/:caseId',
                element: withRouteFallback(<LazyCollectionCaseDetailPage />),
              },
              {
                path: 'auditoria',
                element: withRouteFallback(<LazyAuditoriaPage />),
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'COLLECTION_AGENT']} />,
            children: [
              {
                path: 'minha-cobranca',
                element: withRouteFallback(<LazyMyCollectionPage />),
              },
              {
                path: 'minha-cobranca/:caseId',
                element: withRouteFallback(<LazyCollectionCaseDetailPage />),
              },
            ],
          },
          {
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR', 'FINANCE']} />
            ),
            children: [
              {
                path: 'clientes',
                element: withRouteFallback(<LazyCustomersPage />),
              },
              {
                path: 'clientes/:customerId',
                element: withRouteFallback(<LazyCustomerDetailPage />),
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR']} />,
            children: [
              {
                path: 'backlog',
                element: withRouteFallback(<LazyBacklogPage />),
              },
              {
                path: 'promessas',
                element: withRouteFallback(<LazyPaymentPromisesPage />),
              },
            ],
          },
          {
            element: (
              <RoleGuard
                allowedRoles={['ADMIN', 'SUPERVISOR', 'CANCELLATION_AGENT']}
              />
            ),
            children: [
              {
                path: 'cancelamentos',
                element: withRouteFallback(<LazyCancellationsPage />),
              },
              {
                path: 'cancelamentos/:caseId',
                element: withRouteFallback(<LazyCollectionCaseDetailPage />),
              },
            ],
          },
          {
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR', 'VIEWER']} />
            ),
            children: [
              {
                path: 'relatorios',
                element: withRouteFallback(<LazyReportsPage />),
              },
            ],
          },
          {
            element: (
              <RoleGuard
                allowedRoles={['ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT']}
              />
            ),
            children: [
              {
                path: 'ranking',
                element: withRouteFallback(<LazyRankingPage />),
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={['ADMIN']} />,
            children: [
              {
                path: 'usuarios',
                element: withRouteFallback(<LazyUsersPage />),
              },
              {
                path: 'configuracoes',
                element: withRouteFallback(<LazySettingsPage />),
              },
            ],
          },
          {
            path: 'acesso-negado',
            element: withRouteFallback(<LazyForbiddenPage />),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
