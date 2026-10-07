export type DashboardMetricKey =
  | 'delinquentCustomers'
  | 'openAmount'
  | 'inCollection'
  | 'eligibleForCancellation'
  | 'recoveredMonth'
  | 'activePromises'
  | 'overduePromises'
  | 'cancellationsInProgress'
  | 'assignedActiveCases'
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

export type DashboardOperationsBlockedStep = {
  stepCode: string | null;
  count: number;
};

export type DashboardOperationsCollectionMetrics = {
  activeCases: number;
  newCasesToday: number;
  casesWithoutInteraction: number;
  overdueSlaCases: number;
};

export type DashboardOperationsPromiseMetrics = {
  activePromises: number;
  fulfilledPromises: number;
  brokenPromises: number;
  fulfillmentRate: number;
};

export type DashboardOperationsCancellationMetrics = {
  inProgress: number;
  completed: number;
  averageCompletionDays: number;
  mostBlockedStep: DashboardOperationsBlockedStep;
};

export type DashboardOperationsFinancialMetrics = {
  outstandingAmount: string;
  promisedAmount: string;
  recoveredAmount: string;
  cancelledAmount: string;
};

export type DashboardOperationsResponse = {
  collection: DashboardOperationsCollectionMetrics;
  promises: DashboardOperationsPromiseMetrics;
  cancellations: DashboardOperationsCancellationMetrics;
  financial: DashboardOperationsFinancialMetrics;
};

export type CancellationReasonCategoryBreakdown = {
  category: string;
  label: string;
  count: number;
  percentage: number;
};

export type CancellationReasonBreakdown = {
  reason: string;
  category: string;
  count: number;
};

export type CancellationReasonsResponse = {
  totalClosed: number;
  withReason: number;
  byCategory: CancellationReasonCategoryBreakdown[];
  topReasons: CancellationReasonBreakdown[];
};
