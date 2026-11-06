import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getAgentColor } from '@/features/supervision/utils/agent-colors';
import { type CollectionCasePortfolioSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type PortfolioDistributionBarProps = {
  portfolios: CollectionCasePortfolioSummary[];
  onSelectAgent: (agentId: string | null) => void;
  /** Indicadores resumidos exibidos no cabeçalho, ao lado do total. */
  stats?: Array<{ label: string; value: string }>;
};

type Segment = {
  name: string;
  count: number;
  percent: number;
  color: string | null;
  portfolio: CollectionCasePortfolioSummary;
};

function TooltipRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-neutral">{label}</dt>
      <dd className={cn('font-semibold tabular-nums', danger && 'text-danger')}>
        {value}
      </dd>
    </div>
  );
}

// Balão com o detalhe do trecho: o que a cor representa e os números da carteira.
function SegmentTooltip({
  segment,
  align,
}: {
  segment: Segment;
  align: 'start' | 'center' | 'end';
}) {
  const { portfolio } = segment;
  const isUnassigned = portfolio.agent === null;
  const noInteraction = isUnassigned
    ? portfolio.noManualInteraction
    : Math.max(0, portfolio.totalAssigned - portfolio.interacted);
  const contactedPct =
    portfolio.totalAssigned > 0
      ? Math.round(
          (Math.min(portfolio.interacted, portfolio.totalAssigned) /
            portfolio.totalAssigned) *
            100,
        )
      : 0;

  return (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-full z-20 mb-2 w-60 rounded-lg border border-border bg-card p-3 text-xs shadow-floating',
        align === 'start' && 'left-0',
        align === 'end' && 'right-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={
            segment.color === null
              ? 'h-2.5 w-2.5 shrink-0 rounded-sm bg-warning/30 ring-1 ring-warning/50'
              : 'h-2.5 w-2.5 shrink-0 rounded-sm'
          }
          style={
            segment.color === null
              ? undefined
              : { backgroundColor: segment.color }
          }
          aria-hidden="true"
        />
        <span className="truncate text-sm font-semibold">{segment.name}</span>
      </div>
      <p className="mt-1 text-neutral">
        {isUnassigned
          ? 'Casos ativos ainda sem atendente, aguardando distribuição.'
          : 'Casos ativos na carteira deste atendente.'}
      </p>
      <p className="mt-2 text-sm">
        <span className="font-semibold tabular-nums">
          {formatInteger(segment.count)}
        </span>{' '}
        casos ·{' '}
        <span className="font-semibold tabular-nums">
          {Math.round(segment.percent)}%
        </span>{' '}
        da carteira ativa
      </p>
      <dl className="mt-2 space-y-1 border-t border-border pt-2">
        {isUnassigned ? null : (
          <TooltipRow label="Contatados" value={`${contactedPct}%`} />
        )}
        <TooltipRow
          label="Sem interação"
          value={formatInteger(noInteraction)}
        />
        <TooltipRow
          label="SLA vencido"
          value={formatInteger(portfolio.slaOverdue)}
          danger={portfolio.slaOverdue > 0}
        />
        {isUnassigned ? null : (
          <TooltipRow
            label="Aguardando resposta"
            value={formatInteger(portfolio.awaitingReply)}
          />
        )}
        <TooltipRow
          label="Em aberto"
          value={formatCurrencyFromDecimalString(portfolio.totalOutstanding)}
        />
      </dl>
    </div>
  );
}

// Barra empilhada com a divisão da carteira ativa entre os atendentes e a fila
// sem responsável. Cada trecho é um atalho para abrir os casos daquela carteira.
export function PortfolioDistributionBar({
  portfolios,
  onSelectAgent,
  stats = [],
}: PortfolioDistributionBarProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const total = portfolios.reduce(
    (sum, portfolio) => sum + portfolio.totalActive,
    0,
  );

  if (total === 0) {
    return null;
  }

  const segments = portfolios
    .filter((portfolio) => portfolio.totalActive > 0)
    .map((portfolio) => {
      const color =
        portfolio.agent === null ? null : getAgentColor(portfolio.agent.id);

      return {
        key: portfolio.agent?.id ?? '__unassigned__',
        agentId: portfolio.agent?.id ?? null,
        name: portfolio.agent?.name ?? 'Sem responsável',
        count: portfolio.totalActive,
        percent: (portfolio.totalActive / total) * 100,
        color,
        portfolio,
      };
    });

  return (
    <section
      aria-label="Distribuição da carteira ativa"
      className="rounded-xl border border-border bg-card px-4 py-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-sm font-semibold">
          Carteira ativa{' '}
          <span className="tabular-nums">{formatInteger(total)}</span>{' '}
          <span className="text-xs font-normal text-neutral">
            casos · clique num trecho para ver
          </span>
        </h3>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <dt className="text-neutral">{stat.label}</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex h-8 gap-0.5">
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            className="relative h-full min-w-1"
            style={{ width: `${segment.percent}%` }}
            onMouseEnter={() => setActiveKey(segment.key)}
            onMouseLeave={() => setActiveKey(null)}
          >
            <button
              type="button"
              aria-label={`Filtrar pela carteira de ${segment.name}`}
              onClick={() => onSelectAgent(segment.agentId)}
              onFocus={() => setActiveKey(segment.key)}
              onBlur={() => setActiveKey(null)}
              className={cn(
                'h-full w-full overflow-hidden transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                index === 0 && 'rounded-l-md',
                index === segments.length - 1 && 'rounded-r-md',
              )}
              style={{ backgroundColor: segment.color ?? undefined }}
              data-unassigned={segment.color === null ? 'true' : undefined}
            >
              {segment.color === null ? (
                <span className="block h-full w-full bg-warning/30 ring-1 ring-inset ring-warning/50" />
              ) : null}
            </button>

            {activeKey === segment.key ? (
              <SegmentTooltip
                segment={segment}
                align={
                  index === 0
                    ? 'start'
                    : index === segments.length - 1
                      ? 'end'
                      : 'center'
                }
              />
            ) : null}
          </div>
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span
              className={
                segment.color === null
                  ? 'h-2 w-2 rounded-sm bg-warning/30 ring-1 ring-warning/50'
                  : 'h-2 w-2 rounded-sm'
              }
              style={
                segment.color === null
                  ? undefined
                  : { backgroundColor: segment.color }
              }
              aria-hidden="true"
            />
            <span>{segment.name}</span>
            <span className="font-semibold tabular-nums">
              {formatInteger(segment.count)}
            </span>
            <span className="text-neutral tabular-nums">
              {Math.round(segment.percent)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
