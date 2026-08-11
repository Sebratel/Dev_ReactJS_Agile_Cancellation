import {
  getAlertVariant,
  getCollectionStatusLabel,
  getCollectionStatusVariant,
  getPriorityLabel,
  getPriorityVariant,
  getSlaPresentation,
} from '@/features/collection-cases/utils/collection-case-labels';
import { type DashboardSummaryResponse } from '@/features/dashboard/types/dashboard-api.types';
import {
  type CriticalCase,
  type DashboardMetric,
  type OperationalAlert,
  type OperationalMetricItem,
  type OperationalMetricsGroup,
  type OperationalSummaryItem,
  type RecoveryTrendItem,
  type StatusDistributionItem,
} from '@/features/dashboard/types/dashboard.types';
import { type CollectionCaseListItemResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { getOperationalAlertSupervisionHref } from '@/features/dashboard/utils/operational-alert-links';
import {
  getOperationalMetricAriaLabel,
  getOperationalMetricHref,
} from '@/features/dashboard/utils/operational-metrics-links';
import {
  formatCurrencyFromDecimalString,
  formatDecimalDays,
  formatInteger,
  formatPercentRate,
} from '@/utils/formatters';
import { type DashboardOperationsResponse } from '@/features/dashboard/types/dashboard-api.types';

const metricDefinitions: Array<{
  key: DashboardMetric['key'];
  title: string;
  description: string;
  variant: DashboardMetric['variant'];
  emphasis?: DashboardMetric['emphasis'];
  format: (value: number | string) => string;
}> = [
  {
    key: 'openAmount',
    title: 'Valor em aberto',
    description: 'Montante consolidado aguardando regularização.',
    variant: 'neutral',
    emphasis: 'primary',
    format: (value) => formatCurrencyFromDecimalString(String(value)),
  },
  {
    key: 'eligibleForCancellation',
    title: 'Elegíveis para cancelamento',
    description: 'Clientes sem recuperação após tentativas previstas.',
    variant: 'danger',
    format: (value) => formatInteger(Number(value)),
  },
  {
    key: 'overduePromises',
    title: 'Promessas vencidas',
    description: 'Promessas que exigem recontato imediato.',
    variant: 'danger',
    format: (value) => formatInteger(Number(value)),
  },
  {
    key: 'cancellationsInProgress',
    title: 'Cancelamentos em andamento',
    description: 'Fluxos ativos aguardando protocolo, retirada ou conclusão.',
    variant: 'neutral',
    format: (value) => formatInteger(Number(value)),
  },
  {
    key: 'inCollection',
    title: 'Em cobrança',
    description: 'Casos distribuídos para tratativa operacional.',
    variant: 'neutral',
    format: (value) => formatInteger(Number(value)),
  },
  {
    key: 'delinquentCustomers',
    title: 'Clientes inadimplentes',
    description: 'Carteira ativa com atraso superior a dois meses.',
    variant: 'neutral',
    format: (value) => formatInteger(Number(value)),
  },
  {
    key: 'activePromises',
    title: 'Promessas ativas',
    description: 'Acordos vigentes aguardando vencimento.',
    variant: 'neutral',
    format: (value) => formatInteger(Number(value)),
  },
  {
    key: 'recoveredMonth',
    title: 'Recuperados no mês',
    description: 'Valor efetivamente recuperado com confirmação de pagamento.',
    variant: 'success',
    format: (value) => formatCurrencyFromDecimalString(String(value)),
  },
];

export function mapDashboardSummaryToMetrics(
  summary: DashboardSummaryResponse,
): DashboardMetric[] {
  return metricDefinitions.map((definition) => ({
    key: definition.key,
    title: definition.title,
    description: definition.description,
    variant: definition.variant,
    emphasis: definition.emphasis,
    value: definition.format(summary.metrics[definition.key]),
  }));
}

export function mapDashboardSummaryToOperationalSummary(
  summary: DashboardSummaryResponse,
): OperationalSummaryItem[] {
  return [
    {
      label: 'Recuperados no mês',
      value: formatCurrencyFromDecimalString(
        String(summary.metrics.recoveredMonth),
      ),
      helperText: 'Receita recuperada no ciclo atual da operação.',
    },
    {
      label: 'Promessas ativas',
      value: formatInteger(Number(summary.metrics.activePromises)),
      helperText: 'Clientes com promessa válida aguardando pagamento.',
    },
    {
      label: 'Promessas vencidas',
      value: formatInteger(Number(summary.metrics.overduePromises)),
      helperText: 'Casos que precisam de nova tentativa de contato.',
    },
    {
      label: 'Cancelamentos em andamento',
      value: formatInteger(Number(summary.metrics.cancellationsInProgress)),
      helperText: 'Fluxos ativos ainda sem conclusão operacional.',
    },
  ];
}

export function mapDashboardSummaryToStatusDistribution(
  summary: DashboardSummaryResponse,
): StatusDistributionItem[] {
  return summary.statusDistribution.map((item) => ({
    label: item.label,
    count: item.count,
    variant: getCollectionStatusVariant(item.status),
  }));
}

export function mapDashboardSummaryToRecoveryTrend(
  summary: DashboardSummaryResponse,
): RecoveryTrendItem[] {
  return summary.recoveryTrend.map((item) => ({
    dayLabel: item.dayLabel,
    recoveredAmount: Number(item.recoveredAmount),
    recoveredCases: item.recoveredCases,
  }));
}

export function mapDashboardSummaryToAlerts(
  summary: DashboardSummaryResponse,
): OperationalAlert[] {
  return summary.operationalAlerts.map((alert) => ({
    key: alert.key,
    title: alert.title,
    description: alert.description,
    count: alert.count,
    variant: getAlertVariant(alert.key),
    supervisionHref: getOperationalAlertSupervisionHref(alert.key),
  }));
}

export function mapCollectionCaseToCriticalCase(
  item: CollectionCaseListItemResponse,
): CriticalCase {
  const sla = getSlaPresentation(item.slaDueAt);

  return {
    id: item.id,
    customer: item.customerName,
    contract: item.contractCode,
    daysOverdue: item.daysOverdue,
    outstandingAmount: Number(item.outstandingAmount),
    owner: item.assignedTo?.name ?? 'Não atribuído',
    statusLabel: getCollectionStatusLabel(item.status),
    statusVariant: getCollectionStatusVariant(item.status),
    priorityLabel: getPriorityLabel(item.priority),
    priorityVariant: getPriorityVariant(item.priority),
    slaLabel: sla.label,
    slaVariant: sla.variant,
  };
}

const CANCELLATION_STEP_LABELS: Record<string, string> = {
  LOWER_TITLES: 'Baixar títulos',
  APPLY_FINE: 'Aplicar multa',
  OPEN_ELEVEN_REQUEST: 'Abrir solicitação Eleven',
  ROUTE_PROTOCOL: 'Encaminhar protocolo',
  SEND_WITHDRAWAL_PROTOCOL: 'Enviar protocolo de retirada',
  WAITING_EQUIPMENT_RETURN: 'Aguardar devolução de equipamento',
  EQUIPMENT_RETURNED: 'Equipamento devolvido',
  CANCELLATION_COMPLETED: 'Cancelamento concluído',
};

function formatBlockedStepValue(stepCode: string | null, count: number) {
  if (!stepCode || count === 0) {
    return 'Nenhuma etapa pendente';
  }

  const label = CANCELLATION_STEP_LABELS[stepCode] ?? stepCode;

  return `${label} (${formatInteger(count)})`;
}

function withOperationalMetricLink(
  metric: Omit<OperationalMetricItem, 'href' | 'ariaLabel'>,
): OperationalMetricItem {
  const href = getOperationalMetricHref(metric.key);

  if (!href) {
    return metric;
  }

  return {
    ...metric,
    href,
    ariaLabel: getOperationalMetricAriaLabel(metric.key, metric.label),
  };
}

function mapOperationalMetricItems(
  metrics: Array<Omit<OperationalMetricItem, 'href' | 'ariaLabel'>>,
): OperationalMetricItem[] {
  return metrics.map(withOperationalMetricLink);
}

export function mapDashboardOperationsToGroups(
  operations: DashboardOperationsResponse,
): OperationalMetricsGroup[] {
  return [
    {
      key: 'collection',
      title: 'Cobrança',
      description: 'Carteira ativa e pontos de atenção operacional.',
      metrics: mapOperationalMetricItems([
        {
          key: 'activeCases',
          label: 'Casos ativos',
          value: formatInteger(operations.collection.activeCases),
          description: 'Casos ainda em tratativa na operacao.',
        },
        {
          key: 'newCasesToday',
          label: 'Novos hoje',
          value: formatInteger(operations.collection.newCasesToday),
          description: 'Entradas registradas no dia corrente.',
        },
        {
          key: 'casesWithoutInteraction',
          label: 'Sem interação',
          value: formatInteger(operations.collection.casesWithoutInteraction),
          description: 'Casos sem tentativa de contato registrada.',
          variant: 'danger',
        },
        {
          key: 'overdueSlaCases',
          label: 'SLA vencido',
          value: formatInteger(operations.collection.overdueSlaCases),
          description: 'Itens fora do prazo operacional definido.',
          variant: 'danger',
        },
      ]),
    },
    {
      key: 'promises',
      title: 'Promessas',
      description: 'Acompanhamento de acordos e taxa de cumprimento.',
      metrics: mapOperationalMetricItems([
        {
          key: 'activePromises',
          label: 'Ativas',
          value: formatInteger(operations.promises.activePromises),
          description: 'Promessas vigentes aguardando pagamento.',
        },
        {
          key: 'fulfilledPromises',
          label: 'Cumpridas',
          value: formatInteger(operations.promises.fulfilledPromises),
          description: 'Promessas honradas pelo cliente.',
          variant: 'success',
        },
        {
          key: 'brokenPromises',
          label: 'Quebradas',
          value: formatInteger(operations.promises.brokenPromises),
          description: 'Promessas descumpridas que exigem recontato.',
          variant: 'danger',
        },
        {
          key: 'fulfillmentRate',
          label: 'Taxa de cumprimento',
          value: formatPercentRate(operations.promises.fulfillmentRate),
          description: 'Relação entre promessas cumpridas e quebradas.',
        },
      ]),
    },
    {
      key: 'cancellations',
      title: 'Cancelamentos',
      description: 'Esteira de encerramento e gargalos por etapa.',
      metrics: mapOperationalMetricItems([
        {
          key: 'inProgress',
          label: 'Em andamento',
          value: formatInteger(operations.cancellations.inProgress),
          description: 'Processos com status IN_PROGRESS.',
        },
        {
          key: 'completed',
          label: 'Concluídos',
          value: formatInteger(operations.cancellations.completed),
          description: 'Processos finalizados com sucesso.',
          variant: 'success',
        },
        {
          key: 'averageCompletionDays',
          label: 'Tempo médio',
          value: formatDecimalDays(
            operations.cancellations.averageCompletionDays,
          ),
          description: 'Média entre abertura e conclusão do processo.',
        },
        {
          key: 'mostBlockedStep',
          label: 'Etapa mais congestionada',
          value: formatBlockedStepValue(
            operations.cancellations.mostBlockedStep.stepCode,
            operations.cancellations.mostBlockedStep.count,
          ),
          description: 'Etapa com maior volume de pendências.',
        },
      ]),
    },
    {
      key: 'financial',
      title: 'Financeiro',
      description: 'Leitura consolidada de valores em carteira.',
      metrics: mapOperationalMetricItems([
        {
          key: 'outstandingAmount',
          label: 'Valor em aberto',
          value: formatCurrencyFromDecimalString(
            operations.financial.outstandingAmount,
          ),
          description: 'Montante total em aberto na carteira.',
        },
        {
          key: 'promisedAmount',
          label: 'Valor prometido',
          value: formatCurrencyFromDecimalString(
            operations.financial.promisedAmount,
          ),
          description: 'Soma das promessas ativas.',
        },
        {
          key: 'recoveredAmount',
          label: 'Valor recuperado',
          value: formatCurrencyFromDecimalString(
            operations.financial.recoveredAmount,
          ),
          description: 'Soma das promessas cumpridas.',
          variant: 'success',
        },
        {
          key: 'cancelledAmount',
          label: 'Valor cancelado',
          value: formatCurrencyFromDecimalString(
            operations.financial.cancelledAmount,
          ),
          description: 'Montante de casos encerrados por cancelamento.',
        },
      ]),
    },
  ];
}

export function isDashboardOperationsEmpty(
  operations: DashboardOperationsResponse,
): boolean {
  return (
    operations.collection.activeCases === 0 &&
    operations.promises.activePromises === 0 &&
    operations.cancellations.inProgress === 0 &&
    operations.cancellations.completed === 0 &&
    Number(operations.financial.outstandingAmount) === 0
  );
}
