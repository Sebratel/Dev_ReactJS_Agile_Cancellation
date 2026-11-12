import { cn } from '@/lib/utils';
import { formatInteger } from '@/utils/formatters';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';

type HsmState = 'READ' | 'DELIVERED' | 'SENT' | 'FAILED';

const SEGMENTS: Array<{
  state: HsmState;
  label: string;
  barClass: string;
}> = [
  { state: 'READ', label: 'Lido', barClass: 'bg-success' },
  { state: 'DELIVERED', label: 'Entregue', barClass: 'bg-success/50' },
  { state: 'SENT', label: 'Enviado', barClass: 'bg-neutral/40' },
  { state: 'FAILED', label: 'Não entregue', barClass: 'bg-danger' },
];

type HsmDeliverySummaryProps = {
  // Mesmos filtros da lista (sem o estado do HSM), para o gráfico bater com a
  // tabela.
  baseParams: CollectionCasesListParams;
  activeState: string;
  onSelectState: (state: string) => void;
  className?: string;
};

function useHsmCount(base: CollectionCasesListParams, state: HsmState) {
  const query = useCollectionCases({
    ...base,
    hsmDeliveryState: state,
    page: 1,
    limit: 1,
  });

  return query.data?.pagination.total ?? 0;
}

// Minigráfico do status de entrega dos HSMs enviados (últimos 14 dias): cada
// trecho filtra a lista pelo estado correspondente.
export function HsmDeliverySummary({
  baseParams,
  activeState,
  onSelectState,
  className,
}: HsmDeliverySummaryProps) {
  const counts: Record<HsmState, number> = {
    READ: useHsmCount(baseParams, 'READ'),
    DELIVERED: useHsmCount(baseParams, 'DELIVERED'),
    SENT: useHsmCount(baseParams, 'SENT'),
    FAILED: useHsmCount(baseParams, 'FAILED'),
  };
  const total = SEGMENTS.reduce((sum, { state }) => sum + counts[state], 0);

  const toggle = (state: HsmState) => {
    onSelectState(activeState === state ? '' : state);
  };

  return (
    <section
      aria-label="Entrega do HSM"
      className={cn('min-w-[240px] flex-1', className)}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-neutral">
        <span className="font-medium">Entrega do HSM</span>
        <span className="text-[11px] text-neutral/70">
          {total > 0
            ? `${formatInteger(total)} nos últimos 14 dias · clique para filtrar`
            : 'Nenhum HSM nos últimos 14 dias'}
        </span>
      </div>

      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
        {SEGMENTS.filter(({ state }) => counts[state] > 0).map(
          ({ state, label, barClass }) => (
            <button
              key={state}
              type="button"
              aria-label={`${label}: ${counts[state]}`}
              title={`${label}: ${counts[state]}`}
              onClick={() => toggle(state)}
              className={cn(
                'h-full transition-opacity',
                barClass,
                activeState && activeState !== state && 'opacity-30',
              )}
              style={{ flexGrow: counts[state], flexBasis: 0 }}
            />
          ),
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {SEGMENTS.map(({ state, label, barClass }) => (
          <button
            key={state}
            type="button"
            aria-pressed={activeState === state}
            onClick={() => toggle(state)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-1 text-[11px] text-neutral transition-colors hover:text-foreground',
              activeState === state && 'font-semibold text-foreground',
            )}
          >
            <span
              className={cn('h-2 w-2 rounded-sm', barClass)}
              aria-hidden="true"
            />
            {label}{' '}
            <span className="tabular-nums text-foreground">
              {formatInteger(counts[state])}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
