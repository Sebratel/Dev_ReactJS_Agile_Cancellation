import { cn } from '@/lib/utils';
import { getAverageTicket } from '@/features/ranking/utils/ranking-stats';
import {
  formatCurrencyBRL,
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type RecoveryRankingKpisProps = {
  totalAmount: string;
  totalCases: number;
  collaborators: number;
  /** Receita do mês anterior; ausente quando não há referência. */
  previousAmount?: string;
};

type Kpi = {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
};

export function RecoveryRankingKpis({
  totalAmount,
  totalCases,
  collaborators,
  previousAmount,
}: RecoveryRankingKpisProps) {
  const kpis: Kpi[] = [
    {
      label: 'Receita recuperada',
      value: formatCurrencyFromDecimalString(totalAmount),
      hint:
        previousAmount !== undefined
          ? `Mês anterior: ${formatCurrencyFromDecimalString(previousAmount)}`
          : undefined,
      highlight: true,
    },
    { label: 'Casos recuperados', value: formatInteger(totalCases) },
    {
      label: 'Ticket médio',
      value: formatCurrencyBRL(getAverageTicket(totalAmount, totalCases)),
      hint: 'Receita por caso',
    },
    { label: 'Colaboradores', value: formatInteger(collaborators) },
  ];

  return (
    <section
      aria-label="Indicadores do período"
      className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border bg-card px-5 py-4 shadow-card lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border"
    >
      {kpis.map((kpi) => (
        <div key={kpi.label} className="min-w-0 lg:px-5 lg:first:pl-0">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral">
            {kpi.label}
          </p>
          <p
            className={cn(
              'mt-1 whitespace-nowrap text-xl font-bold tabular-nums xl:text-2xl',
              kpi.highlight ? 'text-success' : 'text-foreground',
            )}
          >
            {kpi.value}
          </p>
          {kpi.hint ? (
            <p className="mt-0.5 text-xs text-neutral">{kpi.hint}</p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
