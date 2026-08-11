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

export default function StatusDistributionChart({
  data,
}: StatusDistributionChartProps) {
  if (data.length === 0) {
    return (
      <SectionCard
        title="Distribuição por status"
        description="Volume atual da carteira por etapa operacional."
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
      description="Volume atual da carteira por etapa operacional."
    >
      <div
        className="h-80 w-full animate-fade-in"
        data-testid="status-distribution-chart"
        role="img"
        aria-label="Gráfico de barras com a distribuição de casos por status"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={240}
          minHeight={240}
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
    </SectionCard>
  );
}
