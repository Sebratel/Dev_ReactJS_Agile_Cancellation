import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SectionCard } from '@/components/data-display/section-card';
import { chartColors } from '@/design-system/chart-colors';
import { type StatusDistributionItem } from '@/features/dashboard/types/dashboard.types';

const variantColorMap = {
  success: chartColors.success,
  warning: chartColors.warning,
  danger: chartColors.danger,
  neutral: chartColors.neutral,
} as const;

type StatusDistributionChartProps = {
  data: StatusDistributionItem[];
};

type StatusBarsProps = {
  data: StatusDistributionItem[];
  testId: string;
  ariaLabel: string;
  height: number;
};

function StatusBars({ data, testId, ariaLabel, height }: StatusBarsProps) {
  return (
    <div
      className="w-full animate-fade-in"
      style={{ height }}
      data-testid={testId}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={240}
        minHeight={120}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: 'hsl(var(--neutral))' }}
            allowDecimals={false}
          />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            width={140}
            fontSize={12}
            tick={{ fill: 'hsl(var(--neutral))' }}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            formatter={(value) => [`${String(value)} casos`, 'Volume']}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid hsl(var(--border))',
              backgroundColor: 'hsl(var(--card))',
              boxShadow:
                '0 4px 12px rgba(17, 17, 17, 0.08), 0 12px 32px rgba(17, 17, 17, 0.1)',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="count" radius={[0, 12, 12, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={variantColorMap[entry.variant]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StatusDistributionChart({
  data,
}: StatusDistributionChartProps) {
  // Carteira (ativos) separada do historico (finalizados) — sem 'group' o item
  // e tratado como carteira.
  const portfolio = data.filter((item) => item.group !== 'history');
  const history = data.filter((item) => item.group === 'history');

  if (data.length === 0) {
    return (
      <SectionCard
        title="Distribuição por status"
        description="Carteira ativa e histórico de finalizados por etapa."
      >
        <p className="py-12 text-center text-sm text-neutral">
          Sem dados de distribuição para exibir no momento.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Distribuição por status"
      description="Carteira ativa (o que está em tratativa) separada do histórico de finalizados."
    >
      <div className="space-y-6">
        {portfolio.length > 0 ? (
          <section aria-label="Carteira ativa">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral">
              Carteira ativa
            </h3>
            <StatusBars
              data={portfolio}
              testId="status-distribution-chart"
              ariaLabel="Gráfico de barras com a distribuição da carteira ativa por status"
              height={Math.max(portfolio.length * 44, 140)}
            />
          </section>
        ) : null}
        {history.length > 0 ? (
          <section aria-label="Histórico (finalizados)">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral">
              Histórico (finalizados)
            </h3>
            <StatusBars
              data={history}
              testId="status-distribution-chart-history"
              ariaLabel="Gráfico de barras com o histórico de casos finalizados por status"
              height={Math.max(history.length * 44, 140)}
            />
          </section>
        ) : null}
      </div>
    </SectionCard>
  );
}
