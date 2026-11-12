import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PhoneOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CollectionCaseListItemResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { getSlaPresentation } from '@/features/collection-cases/utils/collection-case-labels';
import { formatCurrencyBRL, formatInteger } from '@/utils/formatters';

type SnapshotItem = {
  label: string;
  value: string;
  hint: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success';
  icon: typeof ClipboardList;
};

type CollectionCaseSnapshotStripProps = {
  items: CollectionCaseListItemResponse[];
  totalCases?: number;
  className?: string;
  // 'compact': números em linha, sem cartões (para telas com pouco espaço).
  variant?: 'cards' | 'compact';
  // Contadores exatos (sobre todos os casos filtrados). Sem isto, os números
  // são calculados só com os casos da página exibida.
  counts?: {
    notAssigned?: number;
    noResponse?: number;
    overdueSla?: number;
  };
};

const toneStyles: Record<SnapshotItem['tone'], string> = {
  neutral: 'border-border bg-card text-foreground',
  warning: 'border-warning/30 bg-warning/10 text-foreground',
  danger: 'border-danger/25 bg-danger/10 text-foreground',
  success: 'border-success/25 bg-success/10 text-foreground',
};

export function CollectionCaseSnapshotStrip({
  items,
  totalCases,
  className,
  variant = 'cards',
  counts,
}: CollectionCaseSnapshotStripProps) {
  const notAssigned = items.filter((item) => !item.assignedTo).length;
  const noResponseItems = items.filter((item) => item.status === 'NO_RESPONSE');
  const noResponse = noResponseItems.length;
  const overdueSlaItems = items.filter(
    (item) => getSlaPresentation(item.slaDueAt).variant === 'danger',
  );
  const overdueSla = overdueSlaItems.length;
  const overdueSlaOutstanding = overdueSlaItems.reduce(
    (sum, item) => sum + (Number(item.outstandingAmount) || 0),
    0,
  );

  const exact = counts !== undefined;
  const shownNotAssigned = exact ? counts.notAssigned : notAssigned;
  const shownNoResponse = exact ? counts.noResponse : noResponse;
  const shownOverdueSla = exact ? counts.overdueSla : overdueSla;
  const formatCount = (value: number | undefined) =>
    value === undefined ? '—' : formatInteger(value);

  const snapshot: SnapshotItem[] = [
    {
      label: 'Casos ativos',
      value: formatInteger(totalCases ?? items.length),
      hint: `${formatInteger(items.length)} exibidos nesta página`,
      tone: 'neutral',
      icon: ClipboardList,
    },
    {
      label: 'Sem responsável',
      value: formatCount(shownNotAssigned),
      hint:
        (shownNotAssigned ?? 0) > 0
          ? 'Aguardam atribuição de atendente'
          : 'Todos com atendente definido',
      tone: (shownNotAssigned ?? 0) > 0 ? 'warning' : 'success',
      icon: CheckCircle2,
    },
    {
      label: 'Sem resposta',
      value: formatCount(shownNoResponse),
      hint:
        (shownNoResponse ?? 0) > 0
          ? 'Clientes que não responderam ao contato'
          : 'Nenhum caso neste status',
      tone: (shownNoResponse ?? 0) > 0 ? 'danger' : 'neutral',
      icon: PhoneOff,
    },
    {
      label: 'SLA vencido',
      value: formatCount(shownOverdueSla),
      hint:
        (shownOverdueSla ?? 0) > 0
          ? exact
            ? 'Prazo de atendimento vencido'
            : `${formatCurrencyBRL(overdueSlaOutstanding)} em aberto nesses casos`
          : 'Nenhum prazo de atendimento vencido',
      tone: (shownOverdueSla ?? 0) > 0 ? 'danger' : 'success',
      icon: AlertTriangle,
    },
  ];

  if (variant === 'compact') {
    return (
      <section
        aria-label="Resumo operacional da carteira"
        className={cn('flex flex-wrap items-center gap-y-2', className)}
      >
        {snapshot.map(({ label, value, hint, tone }) => (
          <div
            key={label}
            title={hint}
            className="flex flex-col border-r border-border px-4 first:pl-0 last:border-r-0"
          >
            <span
              className={cn(
                'text-xl font-semibold tabular-nums leading-tight',
                value !== '0' && tone === 'danger' && 'text-danger',
                value !== '0' && tone === 'warning' && 'text-warning',
              )}
            >
              {value}
            </span>
            <span className="text-[11px] text-neutral">{label}</span>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      aria-label="Resumo operacional da carteira"
      className={cn('grid gap-3 md:grid-cols-2 xl:grid-cols-4', className)}
    >
      {snapshot.map(({ label, value, hint, tone, icon: Icon }) => (
        <div
          key={label}
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-card',
            toneStyles[tone],
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-neutral">
              {label}
            </p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
            <p className="truncate text-xs text-neutral">{hint}</p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card/70 text-neutral">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      ))}
    </section>
  );
}
