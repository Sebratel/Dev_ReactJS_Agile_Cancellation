import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SectionCard } from '@/components/data-display/section-card';
import { chartColors } from '@/design-system/chart-colors';
import { type CollectionCasePortfolioSummary } from '@/features/collection-cases/types/collection-cases-api.types';

type SupervisionChartsProps = {
  portfolios: CollectionCasePortfolioSummary[];
  byStatus: Record<string, number> | undefined;
  isLoading: boolean;
};

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--card))',
  boxShadow: '0 4px 12px rgba(17, 17, 17, 0.08), 0 12px 32px rgba(17, 17, 17, 0.1)',
  fontSize: '13px',
};

const axisTick = { fill: 'hsl(var(--neutral))' } as const;

const ACTIVE_STATUSES = [
  'WAITING_TRIAGE',
  'IN_COLLECTION',
  'AWAITING_PAYMENT',
  'NO_RESPONSE',
  'ELIGIBLE_FOR_CANCELLATION',
];

function sumStatuses(byStatus: Record<string, number>, keys: string[]) {
  return keys.reduce((total, key) => total + (byStatus[key] ?? 0), 0);
}

function ChartFrame({
  title,
  description,
  hasData,
  children,
}: {
  title: string;
  description: string;
  hasData: boolean;
  children: React.ReactElement;
}) {
  return (
    <SectionCard title={title} description={description}>
      {hasData ? (
        <div className="h-72 w-full animate-fade-in" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%" minWidth={240}>
            {children}
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-neutral">
          Sem dados para exibir no momento.
        </p>
      )}
    </SectionCard>
  );
}

export function SupervisionCharts({
  portfolios,
  byStatus,
  isLoading,
}: SupervisionChartsProps) {
  // 1) Carga por carteira — casos ativos por atendente (+ sem responsável).
  const loadData = useMemo(
    () =>
      portfolios
        .map((portfolio) => ({
          label: portfolio.agent?.name ?? 'Sem responsável',
          count: portfolio.totalActive,
          unassigned: portfolio.agent === null,
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count),
    [portfolios],
  );

  // 2) Desfecho dos casos — a partir da contagem por status.
  const outcomeData = useMemo(() => {
    if (!byStatus) {
      return [];
    }
    const rows = [
      {
        label: 'Ativos',
        count: sumStatuses(byStatus, ACTIVE_STATUSES),
        color: chartColors.warning,
      },
      {
        label: 'Em cancelamento',
        count: byStatus.CANCELLATION_IN_PROGRESS ?? 0,
        color: chartColors.neutral,
      },
      {
        label: 'Recuperado',
        count: byStatus.RECOVERED ?? 0,
        color: chartColors.success,
      },
      {
        label: 'Pagamento realizado',
        count: byStatus.PAYMENT_MADE ?? 0,
        color: chartColors.primary,
      },
      {
        label: 'Encerrado',
        count: byStatus.CLOSED ?? 0,
        color: chartColors.danger,
      },
    ];
    return rows.filter((row) => row.count > 0);
  }, [byStatus]);

  // 3) Esforço por atendente — interagidos x sem interação (só atendentes).
  const effortData = useMemo(
    () =>
      portfolios
        .filter((portfolio) => portfolio.agent !== null && portfolio.totalAssigned > 0)
        .map((portfolio) => ({
          label: portfolio.agent?.name ?? '',
          interagidos: portfolio.interacted,
          semInteracao: Math.max(0, portfolio.totalAssigned - portfolio.interacted),
        }))
        .sort(
          (a, b) =>
            b.interagidos + b.semInteracao - (a.interagidos + a.semInteracao),
        ),
    [portfolios],
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame
        title="Carga por carteira"
        description="Casos ativos por atendente (e sem responsável)."
        hasData={loadData.length > 0}
      >
        <BarChart
          data={loadData}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={axisTick}
            allowDecimals={false}
          />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            width={130}
            fontSize={12}
            tick={axisTick}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            formatter={(value) => [`${String(value)} casos`, 'Ativos']}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="count" radius={[0, 12, 12, 0]}>
            {loadData.map((item) => (
              <Cell
                key={item.label}
                fill={item.unassigned ? chartColors.warning : chartColors.primary}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>

      <ChartFrame
        title="Desfecho dos casos"
        description="Como a carteira se distribui entre ativos e resultados."
        hasData={outcomeData.length > 0}
      >
        <BarChart
          data={outcomeData}
          margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={axisTick}
            interval={0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={axisTick}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            formatter={(value) => [`${String(value)} casos`, 'Volume']}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="count" radius={[12, 12, 0, 0]}>
            {outcomeData.map((item) => (
              <Cell key={item.label} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>

      <ChartFrame
        title="Esforço por atendente"
        description="Casos já trabalhados (contato manual) x ainda sem interação."
        hasData={effortData.length > 0}
      >
        <BarChart
          data={effortData}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={axisTick}
            allowDecimals={false}
          />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            width={130}
            fontSize={12}
            tick={axisTick}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={tooltipStyle}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar
            dataKey="interagidos"
            stackId="carteira"
            name="Interagidos"
            fill={chartColors.success}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="semInteracao"
            stackId="carteira"
            name="Sem interação"
            fill={chartColors.neutral}
            radius={[0, 12, 12, 0]}
          />
        </BarChart>
      </ChartFrame>
    </div>
  );
}
