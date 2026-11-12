export type DashboardMetricKey =
  | 'delinquentCustomers'
  | 'openAmount'
  | 'inCollection'
  | 'eligibleForCancellation'
  | 'recoveredMonth'
  | 'recoveredAfterContactMonth'
  | 'activePromises'
  | 'overduePromises'
  | 'cancellationsInProgress'
  | 'assignedActiveCases'
  | 'contactedCases';

export type DashboardSummaryMetrics = Record<
  DashboardMetricKey,
  number | string
> & {
  // Vencidas de casos em que o cliente já pagou (fora de overduePromises).
  // Opcional: backend antigo, durante um deploy, pode não enviar.
  overduePromisesPaid?: number | string;
};

export type DashboardStatusDistributionItem = {
  status: string;
  label: string;
  count: number;
  // 'portfolio' = carteira ativa; 'history' = finalizados (historico).
  group: 'portfolio' | 'history';
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
  // Indicador inoperante (ex.: 'SLA não configurado') — mostrar o aviso, nao 0.
  notice?: string;
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
  slaConfigured: boolean;
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
  // Todos os motivos (sem corte), para filtros.
  allReasons?: CancellationReasonBreakdown[];
  // CLOSED cujo contrato nao esta Cancelado no ERP (fora do total).
  excludedNotCancelled: number;
};

export type RenegotiationSummaryResponse = {
  available: boolean;
  count: number;
  openAmount: string;
};
