import { formatCurrencyBRL, formatInteger } from '@/utils/formatters';
import type {
  CriticalCase,
  DashboardMetric,
  OperationalAlert,
  OperationalSummaryItem,
  RecoveryTrendItem,
  StatusDistributionItem,
} from '@/features/dashboard/types/dashboard.types';

export const dashboardMetrics: DashboardMetric[] = [
  {
    key: 'delinquentCustomers',
    title: 'Clientes inadimplentes',
    value: formatInteger(128),
    description: 'Carteira ativa com atraso superior a dois meses.',
    variant: 'neutral',
  },
  {
    key: 'openAmount',
    title: 'Valor em aberto',
    value: formatCurrencyBRL(184750.42),
    description: 'Montante consolidado aguardando regularização.',
    variant: 'neutral',
    emphasis: 'primary',
  },
  {
    key: 'inCollection',
    title: 'Em cobrança',
    value: formatInteger(76),
    description: 'Casos distribuídos para tratativa operacional.',
    variant: 'neutral',
  },
  {
    key: 'eligibleForCancellation',
    title: 'Elegíveis para cancelamento',
    value: formatInteger(21),
    description: 'Clientes sem recuperação após tentativas previstas.',
    variant: 'danger',
  },
  {
    key: 'recoveredMonth',
    title: 'Retidos no mês',
    value: formatCurrencyBRL(48320.9),
    description: 'Valor efetivamente recuperado com confirmação de pagamento.',
    variant: 'success',
  },
  {
    key: 'activePromises',
    title: 'Promessas ativas',
    value: formatInteger(34),
    description: 'Acordos vigentes aguardando vencimento.',
    variant: 'neutral',
  },
  {
    key: 'overduePromises',
    title: 'Promessas vencidas',
    value: formatInteger(9),
    description: 'Promessas que exigem recontato imediato.',
    variant: 'danger',
  },
  {
    key: 'cancellationsInProgress',
    title: 'Cancelamentos em andamento',
    value: formatInteger(15),
    description: 'Fluxos ativos aguardando protocolo, retirada ou conclusão.',
    variant: 'neutral',
  },
];

export const operationalSummary: OperationalSummaryItem[] = [
  {
    label: 'Retidos no mês',
    value: formatCurrencyBRL(48320.9),
    helperText: 'Receita recuperada no ciclo atual da operação.',
  },
  {
    label: 'Promessas ativas',
    value: formatInteger(34),
    helperText: 'Clientes com promessa válida aguardando pagamento.',
  },
  {
    label: 'Promessas vencidas',
    value: formatInteger(9),
    helperText: 'Casos que precisam de nova tentativa de contato.',
  },
  {
    label: 'Cancelamentos em andamento',
    value: formatInteger(15),
    helperText: 'Fluxos ativos ainda sem conclusão operacional.',
  },
];

export const statusDistribution: StatusDistributionItem[] = [
  { label: 'Aguardando triagem', count: 18, variant: 'neutral' },
  { label: 'Em cobrança', count: 76, variant: 'neutral' },
  { label: 'Aguardando pagamento', count: 34, variant: 'neutral' },
  { label: 'Sem resposta', count: 22, variant: 'danger' },
  { label: 'Elegível para cancelamento', count: 21, variant: 'danger' },
  { label: 'Cancelamento em andamento', count: 15, variant: 'neutral' },
];

export const recoveryTrend: RecoveryTrendItem[] = [
  { dayLabel: 'Dia 1', recoveredAmount: 4320.5, recoveredCases: 3 },
  { dayLabel: 'Dia 2', recoveredAmount: 6180.2, recoveredCases: 5 },
  { dayLabel: 'Dia 3', recoveredAmount: 5820.9, recoveredCases: 4 },
  { dayLabel: 'Dia 4', recoveredAmount: 7490.3, recoveredCases: 6 },
  { dayLabel: 'Dia 5', recoveredAmount: 6925.4, recoveredCases: 5 },
  { dayLabel: 'Dia 6', recoveredAmount: 8230.8, recoveredCases: 7 },
  { dayLabel: 'Dia 7', recoveredAmount: 9352.8, recoveredCases: 8 },
];

export const operationalAlerts: OperationalAlert[] = [
  {
    key: 'overduePromises',
    title: 'Promessas vencidas',
    description: 'Clientes com promessa descumprida aguardando reabordagem.',
    count: 9,
    variant: 'danger',
    supervisionHref: '/supervisao',
  },
  {
    key: 'noContactAttempt',
    title: 'Casos sem tentativa de contato',
    description:
      'Itens sem primeira ação registrada dentro da janela esperada.',
    count: 12,
    variant: 'danger',
    supervisionHref: '/supervisao',
  },
  {
    key: 'slaBreached',
    title: 'Casos com SLA vencido',
    description:
      'Ocorrências fora do prazo operacional definido pela supervisão.',
    count: 7,
    variant: 'danger',
    supervisionHref: '/supervisao?slaStatus=overdue',
  },
  {
    key: 'awaitingProtocol',
    title: 'Cancelamentos aguardando protocolo',
    description: 'Processos sem protocolo de retirada devidamente registrado.',
    count: 5,
    variant: 'neutral',
    supervisionHref: '/supervisao?status=CANCELLATION_IN_PROGRESS',
  },
];

export const criticalCases: CriticalCase[] = [
  {
    id: 'case_mock_001',
    customer: 'Construtora Horizonte',
    contract: 'CTR-10428',
    daysOverdue: 119,
    outstandingAmount: 12890.55,
    owner: 'Marina Lopes',
    statusLabel: 'Sem resposta',
    statusVariant: 'danger',
    priorityLabel: 'Alta',
    priorityVariant: 'danger',
    slaLabel: 'SLA vencido',
    slaVariant: 'danger',
  },
  {
    id: 'case_mock_002',
    customer: 'Mercado Litoral',
    contract: 'CTR-10311',
    daysOverdue: 133,
    outstandingAmount: 9430.9,
    owner: 'Carlos Nunes',
    statusLabel: 'Elegível para cancelamento',
    statusVariant: 'danger',
    priorityLabel: 'Alta',
    priorityVariant: 'danger',
    slaLabel: 'Ação em 4h',
    slaVariant: 'neutral',
  },
  {
    id: 'case_mock_003',
    customer: 'Clínica São Gabriel',
    contract: 'CTR-10187',
    daysOverdue: 101,
    outstandingAmount: 15120.4,
    owner: 'Rafaela Costa',
    statusLabel: 'Promessa ativa',
    statusVariant: 'neutral',
    priorityLabel: 'Média',
    priorityVariant: 'neutral',
    slaLabel: 'Ação hoje',
    slaVariant: 'neutral',
  },
  {
    id: 'case_mock_004',
    customer: 'Indústria Vale Norte',
    contract: 'CTR-10502',
    daysOverdue: 147,
    outstandingAmount: 21340.7,
    owner: 'Paulo Nogueira',
    statusLabel: 'Cancelamento em andamento',
    statusVariant: 'neutral',
    priorityLabel: 'Alta',
    priorityVariant: 'danger',
    slaLabel: 'Protocolo pendente',
    slaVariant: 'danger',
  },
];
