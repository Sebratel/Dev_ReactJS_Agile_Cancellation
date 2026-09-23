import { useMemo } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  Clock,
  MessageSquareDashed,
  UserRound,
  Users,
} from 'lucide-react';
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

// Chave usada para agrupar/deduplicar carteiras: id do atendente ou o balde
// "sem responsavel".
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

function PortfolioAvatar({
  name,
  avatarUrl,
  unassigned,
}: {
  name: string;
  avatarUrl: string | null;
  unassigned: boolean;
}) {
  if (unassigned) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-neutral">
        <UserRound className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

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

function PortfolioCard({
  portfolio,
  onSelect,
}: {
  portfolio: CollectionCasePortfolioSummary;
  onSelect: () => void;
}) {
  const unassigned = portfolio.agent === null;
  const name = portfolio.agent?.name ?? 'Sem responsável';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        unassigned && portfolio.totalActive > 0
          ? 'border-warning/40'
          : 'border-border',
      )}
      aria-label={`Ver casos de ${name}`}
    >
      <div className="flex items-center gap-3">
        <PortfolioAvatar
          name={name}
          avatarUrl={portfolio.agent?.avatarUrl ?? null}
          unassigned={unassigned}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 truncate font-semibold">{name}</span>
            {unassigned && portfolio.totalActive > 0 ? (
              <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-warning">
                Distribuir
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-neutral">
            {unassigned ? (
              <>
                {formatInteger(portfolio.totalActive)}{' '}
                {portfolio.totalActive === 1 ? 'caso ativo' : 'casos ativos'}
              </>
            ) : (
              <>
                {formatInteger(portfolio.totalAssigned)}{' '}
                {portfolio.totalAssigned === 1
                  ? 'caso na carteira'
                  : 'casos na carteira'}{' '}
                · {formatInteger(portfolio.totalActive)}{' '}
                {portfolio.totalActive === 1 ? 'ativo' : 'ativos'}
              </>
            )}
          </div>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-neutral transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-border pt-3">
        {unassigned ? (
          <Indicator
            icon={AlertTriangle}
            label="SLA vencido"
            value={formatInteger(portfolio.slaOverdue)}
            tone="danger"
          />
        ) : (
          <Indicator
            icon={BadgeCheck}
            label="Interagidos"
            value={formatInteger(portfolio.interacted)}
            tone="neutral"
          />
        )}
        <Indicator
          icon={Clock}
          label="Aguardando resposta"
          value={formatInteger(portfolio.awaitingReply)}
          tone="warning"
        />
        <Indicator
          icon={MessageSquareDashed}
          label="Sem interação"
          value={formatInteger(
            unassigned
              ? portfolio.noManualInteraction
              : Math.max(0, portfolio.totalAssigned - portfolio.interacted),
          )}
          tone="neutral"
        />
        <Indicator
          icon={Users}
          label="Em aberto"
          value={formatCurrencyFromDecimalString(portfolio.totalOutstanding)}
          tone="neutral"
        />
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
  // Mescla as carteiras vindas da API com a lista de atendentes ativos, para
  // que agentes sem nenhum caso ativo tambem aparecam (carteira vazia = ocioso).
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

    return Array.from(byKey.values()).sort((left, right) => {
      // "Sem responsavel" sempre no topo — e o que exige acao da supervisao.
      const leftUnassigned = left.agent === null;
      const rightUnassigned = right.agent === null;
      if (leftUnassigned !== rightUnassigned) {
        return leftUnassigned ? -1 : 1;
      }

      if (right.totalActive !== left.totalActive) {
        return right.totalActive - left.totalActive;
      }

      return (left.agent?.name ?? '').localeCompare(right.agent?.name ?? '');
    });
  }, [portfolios, agents]);

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
              className="h-40 animate-pulse rounded-xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : merged.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral">
          Nenhuma carteira para exibir.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {merged.map((portfolio) => (
            <PortfolioCard
              key={portfolioKey(portfolio)}
              portfolio={portfolio}
              onSelect={() => onSelectAgent(portfolio.agent?.id ?? null)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
