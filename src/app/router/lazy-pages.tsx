import { lazyWithReload } from '@/app/router/lazy-with-reload';

export const LazyDashboardPage = lazyWithReload(
  async () => import('@/features/dashboard/pages/dashboard-page'),
);
export const LazyLoginPage = lazyWithReload(
  async () => import('@/features/auth/pages/login-page'),
);
export const LazyForbiddenPage = lazyWithReload(
  async () => import('@/features/auth/pages/forbidden-page'),
);
export const LazySupervisionPage = lazyWithReload(
  async () => import('@/features/supervision/pages/supervision-page'),
);
export const LazyCollectionCaseDetailPage = lazyWithReload(
  async () =>
    import('@/features/collection-cases/pages/collection-case-detail-page'),
);
export const LazyMyCollectionPage = lazyWithReload(
  async () => import('@/features/collection/pages/my-collection-page'),
);
export const LazyCustomersPage = lazyWithReload(
  async () => import('@/features/customers/pages/customers-page'),
);
export const LazyCustomerDetailPage = lazyWithReload(
  async () => import('@/features/customers/pages/customer-detail-page'),
);
export const LazyBacklogPage = lazyWithReload(
  async () => import('@/features/backlog/pages/backlog-page'),
);
export const LazyPreCollectionPage = lazyWithReload(
  async () => import('@/features/pre-collection/pages/pre-collection-page'),
);
export const LazyPaymentPromisesPage = lazyWithReload(
  async () => import('@/features/payment-promises/pages/payment-promises-page'),
);
export const LazyCancellationsPage = lazyWithReload(
  async () => import('@/features/cancellations/pages/cancellations-page'),
);
export const LazyReportsPage = lazyWithReload(
  async () => import('@/features/reports/pages/reports-page'),
);
export const LazyAuditoriaPage = lazyWithReload(
  async () => import('@/features/auditoria/pages/auditoria-page'),
);
export const LazyUsersPage = lazyWithReload(
  async () => import('@/features/users/pages/users-page'),
);
export const LazySettingsPage = lazyWithReload(
  async () => import('@/features/settings/pages/settings-page'),
);
export const LazyRankingPage = lazyWithReload(
  async () => import('@/features/ranking/pages/ranking-page'),
);
export const LazyWhatsappBulkContactPage = lazyWithReload(
  async () =>
    import('@/features/whatsapp-bulk-contact/pages/whatsapp-bulk-contact-page'),
);
export const LazyCancelledClientsPage = lazyWithReload(
  async () =>
    import('@/features/cancelled-clients/pages/cancelled-clients-page'),
);
