import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Clock,
  MessageSquareDashed,
  UserRound,
  Users,
  UserX,
  Wallet,
} from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
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

function Indicator({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: 'neutral' | 'danger' | 'warning';
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          tone === 'danger' && 'bg-danger/10 text-danger',
          tone === 'warning' && 'bg-warning/10 text-warning',
          tone === 'neutral' && 'bg-muted text-neutral',
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div
          className={cn(
            'text-sm font-semibold tabular-nums leading-none',
            tone === 'danger' && value !== '0' && 'text-danger',
          )}
        >
          {value}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-neutral">{label}</div>
      </div>
    </div>
  );
}

// Progresso de contato: casos da carteira já trabalhados (contato manual) sobre
// o total da carteira. Verde = bom ritmo, âmbar = atenção, vermelho = parado.
function ContactProgress({
  interacted,
  total,
}: {
  interacted: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((Math.min(interacted, total) / total) * 100) : 0;
  const tone =
    pct >= 60 ? 'success' : pct >= 30 ? 'warning' : 'danger';
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
          className={cn('h-full rounded-full', total > 0 ? barClass : 'bg-transparent')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('shrink-0 text-xs font-semibold', total > 0 ? textClass : 'text-neutral')}>
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

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={`Ver casos de ${name}`}
    >
      <div className="flex items-center gap-3">
        <PortfolioAvatar name={name} avatarUrl={portfolio.agent?.avatarUrl ?? null} />
        <div className="min-w-0 flex-1">
          <span className="block min-w-0 truncate font-semibold">{name}</span>
          <div className="mt-0.5 text-xs text-neutral">
            {formatInteger(portfolio.totalAssigned)}{' '}
            {portfolio.totalAssigned === 1 ? 'caso na carteira' : 'casos na carteira'}{' '}
            · {formatInteger(portfolio.totalActive)}{' '}
            {portfolio.totalActive === 1 ? 'ativo' : 'ativos'}
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

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-border pt-3">
        <Indicator
          icon={MessageSquareDashed}
          label="Sem interação"
          value={formatInteger(noInteractionCount(portfolio))}
          tone="neutral"
        />
        <Indicator
          icon={Clock}
          label="Aguardando resposta"
          value={formatInteger(portfolio.awaitingReply)}
          tone="warning"
        />
        <Indicator
          icon={AlertTriangle}
          label="SLA vencido"
          value={formatInteger(portfolio.slaOverdue)}
          tone="danger"
        />
        <Indicator
          icon={Wallet}
          label="Em aberto"
          value={formatCurrencyFromDecimalString(portfolio.totalOutstanding)}
          tone="neutral"
        />
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
      className="group flex w-full flex-col gap-3 rounded-xl border border-warning/50 border-l-4 border-l-warning bg-card p-4 text-left transition-colors hover:bg-warning/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/40"
      aria-label="Ver casos sem responsável"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-semibold">Sem responsável</span>
          <div className="mt-0.5 text-xs text-neutral">
            {formatInteger(portfolio.totalActive)}{' '}
            {portfolio.totalActive === 1 ? 'caso ativo' : 'casos ativos'} · fila
            esperando distribuição
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-sm font-semibold text-white">
          Distribuir
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 border-t border-border pt-3 text-xs text-neutral">
        <span>
          <strong className="font-semibold text-foreground tabular-nums">
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
          <strong className="font-semibold text-foreground tabular-nums">
            {formatCurrencyFromDecimalString(portfolio.totalOutstanding)}
          </strong>{' '}
          em aberto
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
        const diff = Number(right.totalOutstanding) - Number(left.totalOutstanding);
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
    <SectionCard
      title="Carteiras por atendente"
      description="Visão consolidada da carga de cada atendente. Clique numa carteira para ver os casos."
    >
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              title="Carteira ativa"
              value={formatInteger(totals.activeTotal)}
              description="casos ativos na operação"
              icon={Users}
              variant="neutral"
              density="compact"
            />
            <MetricCard
              title="Interagidos"
              value={`${totals.interactedPct}%`}
              description="da carteira com contato"
              icon={Activity}
              variant="success"
              density="compact"
            />
            <MetricCard
              title="Em aberto"
              value={formatCurrencyFromDecimalString(
                totals.outstandingTotal.toFixed(2),
              )}
              description="valor total da carteira"
              icon={Wallet}
              variant="warning"
              density="compact"
            />
            <MetricCard
              title="Sem responsável"
              value={formatInteger(totals.unassignedActive)}
              description="aguardando distribuição"
              icon={UserX}
              variant={totals.unassignedActive > 0 ? 'warning' : 'neutral'}
              density="compact"
            />
          </div>

          {unassigned && unassigned.totalActive > 0 ? (
            <UnassignedCard
              portfolio={unassigned}
              onSelect={() => onSelectAgent(null)}
            />
          ) : null}

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
