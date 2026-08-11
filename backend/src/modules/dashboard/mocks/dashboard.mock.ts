import type { DashboardOperationsResponse } from '@/modules/dashboard/dto/dashboard-operations.response';
import type { DashboardRecoveryRankingItem } from '@/modules/dashboard/dto/dashboard-ranking.response';
import type { DashboardSummaryResponse } from '@/modules/dashboard/dto/dashboard-summary.response';

export const mockDashboardSummary: DashboardSummaryResponse = {
  metrics: {
    delinquentCustomers: 128,
    openAmount: '184750.42',
    inCollection: 76,
    eligibleForCancellation: 21,
    recoveredMonth: '48320.90',
    activePromises: 34,
    overduePromises: 9,
    cancellationsInProgress: 15,
  },
  statusDistribution: [
    {
      status: 'WAITING_TRIAGE',
      label: 'Aguardando triagem',
      count: 18,
    },
    {
      status: 'IN_COLLECTION',
      label: 'Em cobranca',
      count: 76,
    },
    {
      status: 'AWAITING_PAYMENT',
      label: 'Aguardando pagamento',
      count: 34,
    },
    {
      status: 'NO_RESPONSE',
      label: 'Sem resposta',
      count: 22,
    },
    {
      status: 'ELIGIBLE_FOR_CANCELLATION',
      label: 'Elegivel para cancelamento',
      count: 21,
    },
    {
      status: 'CANCELLATION_IN_PROGRESS',
      label: 'Cancelamento em andamento',
      count: 15,
    },
  ],
  recoveryTrend: [
    { dayLabel: 'Dia 1', recoveredAmount: '4320.50', recoveredCases: 3 },
    { dayLabel: 'Dia 2', recoveredAmount: '6180.20', recoveredCases: 5 },
    { dayLabel: 'Dia 3', recoveredAmount: '5820.90', recoveredCases: 4 },
    { dayLabel: 'Dia 4', recoveredAmount: '7490.30', recoveredCases: 6 },
    { dayLabel: 'Dia 5', recoveredAmount: '6925.40', recoveredCases: 5 },
    { dayLabel: 'Dia 6', recoveredAmount: '8230.80', recoveredCases: 7 },
    { dayLabel: 'Dia 7', recoveredAmount: '9352.80', recoveredCases: 8 },
  ],
  operationalAlerts: [
    {
      key: 'overduePromises',
      title: 'Promessas vencidas',
      description: 'Clientes com promessa descumprida aguardando reabordagem.',
      count: 9,
    },
    {
      key: 'noContactAttempt',
      title: 'Casos sem tentativa de contato',
      description:
        'Itens sem primeira acao registrada dentro da janela esperada.',
      count: 12,
    },
    {
      key: 'slaBreached',
      title: 'Casos com SLA vencido',
      description:
        'Ocorrencias fora do prazo operacional definido pela supervisao.',
      count: 7,
    },
    {
      key: 'awaitingProtocol',
      title: 'Cancelamentos aguardando protocolo',
      description:
        'Processos sem protocolo de retirada devidamente registrado.',
      count: 5,
    },
  ],
};

export const mockRecoveryRanking: DashboardRecoveryRankingItem[] = [
  {
    rank: 1,
    userId: 'usr_marina',
    name: 'Marina Lopes',
    recoveredAmount: '38420.75',
    recoveredCases: 14,
  },
  {
    rank: 2,
    userId: 'usr_rafaela',
    name: 'Rafaela Costa',
    recoveredAmount: '31280.40',
    recoveredCases: 11,
  },
  {
    rank: 3,
    userId: 'usr_carlos',
    name: 'Carlos Nunes',
    recoveredAmount: '24960.10',
    recoveredCases: 9,
  },
  {
    rank: 4,
    userId: 'usr_paulo',
    name: 'Paulo Nogueira',
    recoveredAmount: '15730.90',
    recoveredCases: 6,
  },
];

export const mockDashboardOperations: DashboardOperationsResponse = {
  collection: {
    activeCases: 186,
    newCasesToday: 4,
    casesWithoutInteraction: 12,
    overdueSlaCases: 7,
  },
  promises: {
    activePromises: 34,
    fulfilledPromises: 58,
    brokenPromises: 14,
    fulfillmentRate: 58 / (58 + 14),
  },
  cancellations: {
    inProgress: 6,
    completed: 11,
    averageCompletionDays: 5.2,
    mostBlockedStep: {
      stepCode: 'OPEN_ELEVEN_REQUEST',
      count: 9,
    },
  },
  financial: {
    outstandingAmount: '184750.42',
    promisedAmount: '42350.00',
    recoveredAmount: '91280.50',
    cancelledAmount: '31840.75',
  },
};
