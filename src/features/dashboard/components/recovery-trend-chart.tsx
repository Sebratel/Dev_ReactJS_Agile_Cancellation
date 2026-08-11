import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SectionCard } from '@/components/data-display/section-card';
import { chartColors } from '@/design-system/chart-colors';
import { formatCurrencyBRL } from '@/utils/formatters';
import { type RecoveryTrendItem } from '@/features/dashboard/types/dashboard.types';

type RecoveryTrendChartProps = {
  data: RecoveryTrendItem[];
};

export default function RecoveryTrendChart({ data }: RecoveryTrendChartProps) {
  if (data.length === 0) {
    return (
      <SectionCard
        title="Tendência de recuperação"
        description="Últimos 7 dias considerando valor recuperado e quantidade de casos encerrados."
      >
        <p className="py-12 text-center text-sm text-neutral">
          Sem dados de recuperação para exibir no momento.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Tendência de recuperação"
      description="Últimos 7 dias considerando valor recuperado e quantidade de casos encerrados."
    >
      <div
        className="h-80 w-full animate-fade-in"
        data-testid="recovery-trend-chart"
        role="img"
        aria-label="Gráfico combinado de valor recuperado e casos recuperados por dia"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={240}
          minHeight={240}
        >
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tick={{ fill: 'hsl(var(--neutral))' }}
            />
            <YAxis
              yAxisId="amount"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tick={{ fill: 'hsl(var(--neutral))' }}
              tickFormatter={(value: number) => formatCurrencyBRL(value)}
            />
            <YAxis
              yAxisId="cases"
              orientation="right"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tick={{ fill: 'hsl(var(--neutral))' }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              formatter={(value, name) =>
                name === 'Valor recuperado'
                  ? [formatCurrencyBRL(Number(value)), name]
                  : [String(value), name]
              }
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                boxShadow:
                  '0 4px 12px rgba(17, 17, 17, 0.08), 0 12px 32px rgba(17, 17, 17, 0.1)',
                fontSize: '13px',
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '13px' }}
            />
            <Bar
              yAxisId="amount"
              dataKey="recoveredAmount"
              name="Valor recuperado"
              fill={chartColors.primary}
              radius={[12, 12, 0, 0]}
            />
            <Line
              yAxisId="cases"
              type="monotone"
              dataKey="recoveredCases"
              name="Casos recuperados"
              stroke={chartColors.success}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
