import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';
import { type AuditLogsListParams } from '@/features/auditoria/types/auditoria-api.types';
import { type UsersListParams } from '@/features/users/types/users-api.types';
import { type CustomersListParams } from '@/features/customers/types/customers-api.types';
import { type PaymentPromisesListParams } from '@/features/payment-promises/types/payment-promises-api.types';
import { type IntegrationEventsListParams } from '@/features/integrations/types/integration-events-api.types';
import { type NotificationsListParams } from '@/features/notifications/types/notifications-api.types';

export const queryKeys = {
  integrations: {
    elevenStatus: ['integrations', 'eleven', 'status'] as const,
    events: {
      all: ['integration-events'] as const,
      list: (params: IntegrationEventsListParams) =>
        ['integration-events', 'list', params] as const,
      summary: ['integration-events', 'summary'] as const,
    },
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    operations: ['dashboard', 'operations'] as const,
    recoveryRanking: (period: string) =>
      ['dashboard', 'recovery-ranking', period] as const,
    recoveryRankingAll: ['dashboard', 'recovery-ranking'] as const,
  },
  collectionCases: {
    all: ['collection-cases'] as const,
    list: (params: CollectionCasesListParams) =>
      ['collection-cases', 'list', params] as const,
    detail: (caseId: string) => ['collection-cases', 'detail', caseId] as const,
    timeline: (caseId: string) =>
      ['collection-cases', 'timeline', caseId] as const,
    notes: (caseId: string) =>
      ['collection-cases', 'notes', caseId] as const,
    overdueDateSummary: (params: CollectionCasesListParams) =>
      ['collection-cases', 'overdue-date-summary', params] as const,
    bulkContactWhatsAppJob: (jobId: string) =>
      ['collection-cases', 'bulk-contact-whatsapp-job', jobId] as const,
    bulkContactWhatsAppJobsList: (page: number) =>
      ['collection-cases', 'bulk-contact-whatsapp-jobs', page] as const,
  },
  auditoria: {
    list: (params: AuditLogsListParams) =>
      ['auditoria', 'list', params] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: UsersListParams) => ['users', 'list', params] as const,
    workload: ['users', 'workload'] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (params: CustomersListParams) =>
      ['customers', 'list', params] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  paymentPromises: {
    all: ['payment-promises'] as const,
    list: (params: PaymentPromisesListParams) =>
      ['payment-promises', 'list', params] as const,
    summary: ['payment-promises', 'summary'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (params: NotificationsListParams) =>
      ['notifications', 'list', params] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
} as const;
