import { lazy } from 'react';

export const LazyDashboardPage = lazy(
  async () => import('@/features/dashboard/pages/dashboard-page'),
);
export const LazyLoginPage = lazy(
  async () => import('@/features/auth/pages/login-page'),
);
export const LazyForbiddenPage = lazy(
  async () => import('@/features/auth/pages/forbidden-page'),
);
export const LazySupervisionPage = lazy(
  async () => import('@/features/supervision/pages/supervision-page'),
);
export const LazyCollectionCaseDetailPage = lazy(
  async () =>
    import('@/features/collection-cases/pages/collection-case-detail-page'),
);
export const LazyMyCollectionPage = lazy(
  async () => import('@/features/collection/pages/my-collection-page'),
);
export const LazyCustomersPage = lazy(
  async () => import('@/features/customers/pages/customers-page'),
);
export const LazyCustomerDetailPage = lazy(
  async () => import('@/features/customers/pages/customer-detail-page'),
);
export const LazyBacklogPage = lazy(
  async () => import('@/features/backlog/pages/backlog-page'),
);
export const LazyPreCollectionPage = lazy(
  async () => import('@/features/pre-collection/pages/pre-collection-page'),
);
export const LazyPaymentPromisesPage = lazy(
  async () => import('@/features/payment-promises/pages/payment-promises-page'),
);
export const LazyCancellationsPage = lazy(
  async () => import('@/features/cancellations/pages/cancellations-page'),
);
export const LazyReportsPage = lazy(
  async () => import('@/features/reports/pages/reports-page'),
);
export const LazyAuditoriaPage = lazy(
  async () => import('@/features/auditoria/pages/auditoria-page'),
);
export const LazyUsersPage = lazy(
  async () => import('@/features/users/pages/users-page'),
);
export const LazySettingsPage = lazy(
  async () => import('@/features/settings/pages/settings-page'),
);
export const LazyRankingPage = lazy(
  async () => import('@/features/ranking/pages/ranking-page'),
);
export const LazyWhatsappBulkContactPage = lazy(
  async () =>
    import('@/features/whatsapp-bulk-contact/pages/whatsapp-bulk-contact-page'),
);
