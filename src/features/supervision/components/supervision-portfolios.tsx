import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  MessageSquareDashed,
  UserRound,
} from 'lucide-react';
import { PortfolioDistributionBar } from '@/features/supervision/components/portfolio-distribution-bar';
import { SectionCard } from '@/components/data-display/section-card';
import { cn } from '@/lib/utils';
import { type CollectionCasePortfolioSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { type UserResponse } from '@/features/users/types/users-api.types';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type SupervisionPortfoliosProps = {
  portfolios: CollectionCasePortfolioSummary[];
  agents: UserResponse[];
  isLoading: boolean;
  onSelectAgent: (agentId: string | null) => void;
};

type SortKey = 'load' | 'outstanding' | 'noInteraction';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'load', label: 'Carga' },
  { key: 'outstanding', label: 'Em aberto' },
  { key: 'noInteraction', label: 'Sem interação' },
];

const UNASSIGNED_KEY = '__unassigned__';

function portfolioKey(portfolio: CollectionCasePortfolioSummary) {
  return portfolio.agent?.id ?? UNASSIGNED_KEY;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : '';
  return `${first}${last}`.toUpperCase() || '?';
}

function noInteractionCount(portfolio: CollectionCasePortfolioSummary) {
  return portfolio.agent === null
    ? portfolio.noManualInteraction
    : Math.max(0, portfolio.totalAssigned - portfolio.interacted);
}

function PortfolioAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-foreground">
      {getInitials(name)}
    </span>
  );
}

// Só o que exige atenção ganha destaque; zeros não disputam o olhar.
function AttentionPill({
  icon: Icon,
  text,
  tone,
}: {
  icon: React.ElementType;
  text: string;
  tone: 'danger' | 'warning' | 'info';
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tone === 'danger' && 'bg-danger/10 text-danger',
        tone === 'warning' && 'bg-warning/15 text-warning',
        tone === 'info' && 'bg-primary/15 text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}

// Progresso de contato: casos ativos da carteira já trabalhados (contato manual
// no ciclo atual) sobre o total de casos ativos. Verde = bom ritmo, âmbar = atenção, vermelho = parado.
function ContactProgress({
  interacted,
  total,
}: {
  interacted: number;
  total: number;
}) {
  const pct =
    total > 0 ? Math.round((Math.min(interacted, total) / total) * 100) : 0;
  const tone = pct >= 60 ? 'success' : pct >= 30 ? 'warning' : 'danger';
  const barClass =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warning'
        ? 'bg-warning'
        : 'bg-danger';
  const textClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-danger';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full',
            total > 0 ? barClass : 'bg-transparent',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          'shrink-0 text-xs font-semibold',
          total > 0 ? textClass : 'text-neutral',
        )}
      >
        {total > 0 ? `${pct}% contatados` : 'carteira vazia'}
      </span>
    </div>
  );
}

function PortfolioCard({
  portfolio,
  onSelect,
}: {
  portfolio: CollectionCasePortfolioSummary;
  onSelect: () => void;
}) {
  const name = portfolio.agent?.name ?? 'Sem responsável';
  const noInteraction = noInteractionCount(portfolio);
  const needsAttention = portfolio.slaOverdue > 0 || noInteraction > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex flex-col gap-3.5 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        needsAttention
          ? 'border-warning/50 hover:border-warning'
          : 'border-border hover:border-primary/40',
      )}
      aria-label={`Ver casos de ${name}`}
    >
      <div className="flex items-center gap-3">
        <PortfolioAvatar
          name={name}
          avatarUrl={portfolio.agent?.avatarUrl ?? null}
        />
        <div className="min-w-0 flex-1">
          <span className="block min-w-0 truncate font-semibold">{name}</span>
          <div className="mt-0.5 text-xs text-neutral">
            {formatInteger(portfolio.totalAssigned)}{' '}
            {portfolio.totalAssigned === 1
              ? 'caso ativo na carteira'
              : 'casos ativos na carteira'}
          </div>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-neutral transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>

      <ContactProgress
        interacted={portfolio.interacted}
        total={portfolio.totalAssigned}
      />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border pt-3.5">
        {portfolio.slaOverdue > 0 ? (
          <AttentionPill
            icon={AlertTriangle}
            tone="danger"
            text={`${formatInteger(portfolio.slaOverdue)} SLA vencido`}
          />
        ) : null}
        {noInteraction > 0 ? (
          <AttentionPill
            icon={MessageSquareDashed}
            tone="warning"
            text={`${formatInteger(noInteraction)} sem interação`}
          />
        ) : null}
        {portfolio.awaitingReply > 0 ? (
          <AttentionPill
            icon={Clock}
            tone="info"
            text={`${formatInteger(portfolio.awaitingReply)} aguardando resposta`}
          />
        ) : null}
        {!needsAttention ? (
          <p className="flex items-center gap-1.5 text-xs text-neutral">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Sem pendências
          </p>
        ) : null}
        <span className="mt-1 flex w-full items-baseline justify-between border-t border-border pt-2.5">
          <span className="text-xs text-neutral">Em aberto</span>
          <span className="text-base font-semibold tabular-nums">
            {formatCurrencyFromDecimalString(portfolio.totalOutstanding)}
          </span>
        </span>
      </div>
    </button>
  );
}

function UnassignedCard({
  portfolio,
  onSelect,
}: {
  portfolio: CollectionCasePortfolioSummary;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full flex-col gap-3 rounded-xl border border-warning/50 border-l-4 border-l-warning bg-card px-4 py-4 text-left transition-colors hover:bg-warning/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/40"
      aria-label="Ver casos sem responsável"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-semibold">Sem responsável</span>
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral">
            <span>
              {formatInteger(portfolio.totalActive)}{' '}
              {portfolio.totalActive === 1 ? 'caso ativo' : 'casos ativos'} ·
              aguardando distribuição
            </span>
            <span>
              <strong className="font-semibold tabular-nums text-foreground">
                {formatInteger(portfolio.noManualInteraction)}
              </strong>{' '}
              sem interação
            </span>
            <span>
              <strong
                className={cn(
                  'font-semibold tabular-nums',
                  portfolio.slaOverdue > 0 ? 'text-danger' : 'text-foreground',
                )}
              >
                {formatInteger(portfolio.slaOverdue)}
              </strong>{' '}
              SLA vencido
            </span>
            <span>
              <strong className="font-semibold tabular-nums text-foreground">
                {formatCurrencyFromDecimalString(portfolio.totalOutstanding)}
              </strong>{' '}
              em aberto
            </span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-sm font-semibold text-white">
          Distribuir
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

export function SupervisionPortfolios({
  portfolios,
  agents,
  isLoading,
  onSelectAgent,
}: SupervisionPortfoliosProps) {
  const [sortBy, setSortBy] = useState<SortKey>('load');

  const merged = useMemo(() => {
    const byKey = new Map<string, CollectionCasePortfolioSummary>();

    for (const portfolio of portfolios) {
      byKey.set(portfolioKey(portfolio), portfolio);
    }

    for (const agent of agents) {
      if (!byKey.has(agent.id)) {
        byKey.set(agent.id, {
          agent: {
            id: agent.id,
            name: agent.name,
            avatarUrl: agent.avatarUrl ?? null,
          },
          totalActive: 0,
          totalAssigned: 0,
          interacted: 0,
          slaOverdue: 0,
          awaitingReply: 0,
          noManualInteraction: 0,
          totalOutstanding: '0.00',
        });
      }
    }

    return Array.from(byKey.values());
  }, [portfolios, agents]);

  const unassigned = useMemo(
    () => merged.find((portfolio) => portfolio.agent === null),
    [merged],
  );

  const agentCards = useMemo(() => {
    const onlyAgents = merged.filter((portfolio) => portfolio.agent !== null);

    return onlyAgents.sort((left, right) => {
      if (sortBy === 'outstanding') {
        const diff =
          Number(right.totalOutstanding) - Number(left.totalOutstanding);
        if (diff !== 0) return diff;
      } else if (sortBy === 'noInteraction') {
        const diff = noInteractionCount(right) - noInteractionCount(left);
        if (diff !== 0) return diff;
      } else if (right.totalActive !== left.totalActive) {
        return right.totalActive - left.totalActive;
      }

      return (left.agent?.name ?? '').localeCompare(right.agent?.name ?? '');
    });
  }, [merged, sortBy]);

  const totals = useMemo(() => {
    let activeTotal = 0;
    let assignedAgents = 0;
    let interactedAgents = 0;
    let outstandingTotal = 0;

    for (const portfolio of merged) {
      activeTotal += portfolio.totalActive;
      outstandingTotal += Number(portfolio.totalOutstanding);
      if (portfolio.agent !== null) {
        assignedAgents += portfolio.totalAssigned;
        interactedAgents += portfolio.interacted;
      }
    }

    const interactedPct =
      assignedAgents > 0
        ? Math.round((interactedAgents / assignedAgents) * 100)
        : 0;

    return {
      activeTotal,
      interactedPct,
      outstandingTotal,
      unassignedActive: unassigned?.totalActive ?? 0,
    };
  }, [merged, unassigned]);

  return (
    <SectionCard title="Carteiras por atendente">
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : merged.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral">
          Nenhuma carteira para exibir.
        </p>
      ) : (
        <div className="space-y-5">
          {unassigned && unassigned.totalActive > 0 ? (
            <UnassignedCard
              portfolio={unassigned}
              onSelect={() => onSelectAgent(null)}
            />
          ) : null}

          <PortfolioDistributionBar
            portfolios={merged}
            onSelectAgent={onSelectAgent}
            stats={[
              {
                label: 'Interagidos',
                value: `${totals.interactedPct}%`,
              },
              {
                label: 'Em aberto',
                value: formatCurrencyFromDecimalString(
                  totals.outstandingTotal.toFixed(2),
                ),
              },
            ]}
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Atendentes</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-neutral">Ordenar:</span>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSortBy(option.key)}
                  className={cn(
                    'rounded-full px-3 py-1 transition-colors',
                    sortBy === option.key
                      ? 'bg-primary text-foreground'
                      : 'border border-border text-neutral hover:bg-muted/50',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {agentCards.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral">
              Nenhum atendente com carteira para exibir.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {agentCards.map((portfolio) => (
                <PortfolioCard
                  key={portfolioKey(portfolio)}
                  portfolio={portfolio}
                  onSelect={() => onSelectAgent(portfolio.agent?.id ?? null)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
