export type DashboardMetricKey =
  | 'delinquentCustomers'
  | 'openAmount'
  | 'inCollection'
  | 'eligibleForCancellation'
  | 'recoveredMonth'
  | 'activePromises'
  | 'overduePromises'
  | 'cancellationsInProgress'
  // Carteira ativa (não finalizada) no escopo — para o atendente, a dele.
  | 'assignedActiveCases'
  // Casos da carteira ativa com ao menos uma tentativa manual (já contatados).
  | 'contactedCases';

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
