export type DashboardMetricKey =
  | 'delinquentCustomers'
  | 'openAmount'
  | 'inCollection'
  | 'eligibleForCancellation'
  | 'recoveredMonth'
  // Parte do recuperado no mês que veio de contato de atendente antes do
  // pagamento (RECOVERED). O restante de `recoveredMonth` pagou sozinho.
  | 'recoveredAfterContactMonth'
  | 'activePromises'
  | 'overduePromises'
  // Promessas vencidas de casos em que o cliente já pagou (fora de overduePromises).
  | 'overduePromisesPaid'
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
  // Quando preenchido, o indicador nao esta operante (ex.: 'SLA não
  // configurado') e a tela mostra o aviso em vez de um 0 enganoso.
  notice?: string;
};

export type DashboardSummaryResponse = {
  metrics: DashboardSummaryMetrics;
  statusDistribution: DashboardStatusDistributionItem[];
  recoveryTrend: DashboardRecoveryTrendItem[];
  operationalAlerts: DashboardOperationalAlert[];
};
