import { CalendarPlus, TrendingDown, TrendingUp } from 'lucide-react';
import { useCollectionCasesIntakeSummary } from '@/features/collection-cases/hooks/use-collection-cases-intake-summary';
import { cn } from '@/lib/utils';

// Painel de inflow diario: quantos casos entraram hoje x ontem (createdAt).
// Serve para o supervisor conferir se o volume bate com o fluxo de automacao
// (N8N) que alimenta a esteira.
export function SupervisionIntakeSummary() {
  const { data, isLoading, isError } = useCollectionCasesIntakeSummary();

  if (isError) {
    return null;
  }

  const today = data?.today ?? 0;
  const yesterday = data?.yesterday ?? 0;
  const delta = today - yesterday;

  return (
    <section
      aria-label="Entradas de casos por dia"
      className="rounded-xl border border-border bg-card px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral">
          <CalendarPlus className="h-4 w-4 text-primary" aria-hidden="true" />
          Entradas na esteira
        </div>
        {!isLoading && delta !== 0 ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
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

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium text-neutral">Hoje</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {isLoading ? '—' : today}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium text-neutral">Ontem</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {isLoading ? '—' : yesterday}
          </p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-neutral/70">
        Casos que entraram na esteira em cada dia — use para conferir com o
        fluxo de automação (N8N).
      </p>
    </section>
  );
}
