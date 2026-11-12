import { CalendarPlus, TrendingDown, TrendingUp } from 'lucide-react';
import { useCollectionCasesIntakeSummary } from '@/features/collection-cases/hooks/use-collection-cases-intake-summary';
import { cn } from '@/lib/utils';

// Inflow diário (hoje x ontem, por createdAt), em uma linha: serve para o
// supervisor conferir se o volume bate com o fluxo de automação (N8N) que
// alimenta a esteira. Pensado para ir dentro da faixa de status da tela.
export function SupervisionIntakeSummary() {
  const { data, isLoading, isError } = useCollectionCasesIntakeSummary();

  if (isError) {
    return null;
  }

  const today = data?.today ?? 0;
  const yesterday = data?.yesterday ?? 0;
  const delta = today - yesterday;

  return (
    <div
      aria-label="Entradas de casos por dia"
      title="Casos que entraram na esteira em cada dia. Use para conferir com o fluxo de automação (N8N)."
      className="flex items-center gap-2 text-neutral"
    >
      <CalendarPlus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      <span>
        Entradas hoje{' '}
        <span className="font-semibold tabular-nums text-foreground">
          {isLoading ? '—' : today}
        </span>{' '}
        · ontem{' '}
        <span className="font-semibold tabular-nums text-foreground">
          {isLoading ? '—' : yesterday}
        </span>
      </span>
      {!isLoading && delta !== 0 ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold',
            delta > 0
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger',
          )}
        >
          {delta > 0 ? (
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
          )}
          {delta > 0 ? `+${delta}` : delta} vs. ontem
        </span>
      ) : null}
    </div>
  );
}
