export type DashboardMetricKey =
  | 'delinquentCustomers'
  | 'openAmount'
  | 'inCollection'
  | 'eligibleForCancellation'
  | 'recoveredMonth'
  | 'activePromises'
  | 'overduePromises'
  | 'cancellationsInProgress';

export type DashboardSummaryMetrics = Record<
  DashboardMetricKey,
  number | string
>;

export type DashboardStatusDistributionItem = {
  status: string;
  label: string;
  count: number;
};

export type DashboardRecoveryTrendItem = {
  dayLabel: string;
  recoveredAmount: string;
  recoveredCases: number;
};

export type DashboardOperationalAlert = {
  key: string;
  title: string;
  description: string;
  count: number;
};

export type DashboardSummaryResponse = {
  metrics: DashboardSummaryMetrics;
  statusDistribution: DashboardStatusDistributionItem[];
  recoveryTrend: DashboardRecoveryTrendItem[];
  operationalAlerts: DashboardOperationalAlert[];
};
