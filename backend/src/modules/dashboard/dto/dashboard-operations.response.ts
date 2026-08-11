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
