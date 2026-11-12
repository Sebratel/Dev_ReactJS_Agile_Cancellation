import { SectionCard } from '@/components/data-display/section-card';
import { type DashboardRecoveryTrendItem } from '@/features/dashboard/types/dashboard-api.types';
import { formatCurrencyBRL, formatInteger } from '@/utils/formatters';

type SupervisorRecoveryCardProps = {
  trend: DashboardRecoveryTrendItem[];
};

const BAR_AREA = 56;

// Recuperação (paga após contato) dos últimos 7 dias, uma barra por dia; o dia
// mais recente (hoje) fica em destaque.
export function SupervisorRecoveryCard({ trend }: SupervisorRecoveryCardProps) {
  const values = trend.map((day) => Number(day.recoveredAmount) || 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const cases = trend.reduce((sum, day) => sum + day.recoveredCases, 0);
  const max = Math.max(...values, 0);
  const lastIndex = trend.length - 1;

  return (
    <SectionCard
      title="Recuperação, 7 dias"
      description="Pago após contato de atendente"
      contentClassName="p-4"
    >
      {trend.length === 0 || total === 0 ? (
        <p className="py-6 text-center text-sm text-neutral">
          Nenhuma recuperação nos últimos 7 dias.
        </p>
      ) : (
        <>
          <p className="text-xl font-bold tabular-nums">
            {formatCurrencyBRL(total)}
            <span className="ml-2 text-xs font-normal text-neutral">
              {formatInteger(cases)} {cases === 1 ? 'caso' : 'casos'}
            </span>
          </p>
          <div
            className="mt-3 flex items-end gap-1.5"
            style={{ height: BAR_AREA }}
            role="img"
            aria-label="Valor recuperado por dia nos últimos 7 dias"
          >
            {trend.map((day, index) => {
              const value = values[index] ?? 0;
              const height =
                max > 0
                  ? Math.max((value / max) * BAR_AREA, value > 0 ? 4 : 2)
                  : 2;

              return (
                <div
                  key={day.dayLabel}
                  className="flex-1 rounded-t-md"
                  style={{
                    height,
                    backgroundColor:
                      index === lastIndex
                        ? 'hsl(var(--success))'
                        : 'hsl(var(--border))',
                  }}
                  title={`${day.dayLabel}: ${formatCurrencyBRL(value)} · ${day.recoveredCases} ${day.recoveredCases === 1 ? 'caso' : 'casos'}`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-neutral">
            <span>{trend[0]?.dayLabel}</span>
            <span>hoje</span>
          </div>
        </>
      )}
    </SectionCard>
  );
}
