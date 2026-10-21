import { type StatusVariant } from '@/types/ui';

export type DashboardMetric = {
  key:
    | 'delinquentCustomers'
    | 'openAmount'
    | 'inCollection'
    | 'eligibleForCancellation'
    | 'recoveredMonth'
    | 'activePromises'
    | 'overduePromises'
    | 'cancellationsInProgress';
  title: string;
  value: string;
  description: string;
  variant: StatusVariant;
  emphasis?: 'primary' | 'default';
};

export type OperationalSummaryItem = {
  label: string;
  value: string;
  helperText: string;
};

export type StatusDistributionItem = {
  label: string;
  count: number;
  variant: StatusVariant;
  group?: 'portfolio' | 'history';
};

export type RecoveryTrendItem = {
  dayLabel: string;
  recoveredAmount: number;
  recoveredCases: number;
};

export type OperationalAlert = {
  key: string;
  title: string;
  description: string;
  count: number;
  variant: StatusVariant;
  notice?: string;
  supervisionHref?: string;
};

export type CriticalCase = {
  id: string;
  customer: string;
  contract: string;
  daysOverdue: number;
  outstandingAmount: number;
  owner: string;
  statusLabel: string;
  statusVariant: StatusVariant;
  priorityLabel: string;
  priorityVariant: StatusVariant;
  slaLabel: string;
  slaVariant: StatusVariant;
};

export type OperationalMetricItem = {
  key: string;
  label: string;
  value: string;
  description: string;
  variant?: StatusVariant;
  href?: string;
  ariaLabel?: string;
};

export type OperationalMetricsGroup = {
  key: 'collection' | 'promises' | 'cancellations' | 'financial';
  title: string;
  description: string;
  metrics: OperationalMetricItem[];
};
