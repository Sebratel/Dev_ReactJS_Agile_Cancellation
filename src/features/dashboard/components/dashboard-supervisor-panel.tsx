import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Headphones,
  Hourglass,
  Inbox,
  Repeat,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
  UserX,
} from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { SectionCard } from '@/components/data-display/section-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRenegotiationSummary } from '@/features/dashboard/hooks/use-renegotiation-summary';
import { type DashboardSummaryResponse } from '@/features/dashboard/types/dashboard-api.types';
import { type CollectionCasePortfolioSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type DashboardSupervisorPanelProps = {
  summary: DashboardSummaryResponse;
  portfolios: CollectionCasePortfolioSummary[];
  portfoliosLoading: boolean;
};

type SupervisorActionTone = 'danger' | 'warning' | 'neutral';

const ACTION_TONE_CLASSES: Record<SupervisorActionTone, string> = {
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  neutral: 'border border-border text-foreground',
};

export function DashboardSupervisorPanel({
  summary,
  portfolios,
  portfoliosLoading,
}: DashboardSupervisorPanelProps) {
  const unassigned = portfolios.find((portfolio) => portfolio.agent === null);
  const agentLoads = portfolios
    .filter(
      (portfolio) => portfolio.agent !== null && portfolio.totalActive > 0,
    )
    .map((portfolio) => ({
      label: portfolio.agent?.name ?? 'Sem responsável',
      count: portfolio.totalActive,
      unassigned: false,
    }));

  if (unassigned && unassigned.totalActive > 0) {
    agentLoads.push({
      label: 'Sem responsável',
      count: unassigned.totalActive,
      unassigned: true,
    });
  }

  agentLoads.sort((a, b) => b.count - a.count);
  const maxLoad = agentLoads.reduce(
    (max, item) => Math.max(max, item.count),
    0,
  );

  const inactiveAgents =
    summary.operationalAlerts.find((alert) => alert.key === 'inactiveAgents')
      ?.count ?? 0;

  // Mesma fonte da aba Renegociados (ERP). Indisponivel != 0.
  const renegotiationQuery = useRenegotiationSummary();
  const renegotiationData = renegotiationQuery.data;
  const renegotiatedOpen: number | string =
    renegotiationData?.available === true
      ? renegotiationData.count
      : renegotiationQuery.isLoading
        ? '…'
        : 'Indisponível';

  const actions: Array<{
    label: string;
    helper: string;
    value: number | string;
    tone: SupervisorActionTone;
    icon: typeof ShieldAlert;
    href: string;
  }> = [
    {
      label: 'Elegíveis p/ cancelamento',
      helper: 'esforço de recuperação esgotado',
      value: Number(summary.metrics.eligibleForCancellation),
      tone: 'danger',
      icon: ShieldAlert,
      href: '/supervisao?status=ELIGIBLE_FOR_CANCELLATION',
    },
    {
      label: 'Promessas vencidas',
      helper: 'acordo furado, sem recontato',
      value: Number(summary.metrics.overduePromises),
      tone: 'warning',
      icon: Hourglass,
      href: '/supervisao?promiseStatus=BROKEN',
    },
    {
      label: 'Atendentes sem movimento',
      helper: 'sem contato registrado hoje',
      value: inactiveAgents,
      tone: 'neutral',
      icon: UserX,
      href: '/supervisao',
    },
    {
      label: 'Renegociados em aberto',
      helper: 'renegociaram e ainda devem',
      value: renegotiatedOpen,
      tone: 'warning',
      icon: Repeat,
      href: '/supervisao',
    },
    {
      label: 'Sem responsável',
      helper: 'fila esperando distribuição',
      value: unassigned?.totalActive ?? 0,
      tone: 'neutral',
      icon: Inbox,
      href: '/supervisao?assignedToId=unassigned',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Supervisão
          </span>
          <div>
            <h2 className="text-xl font-bold leading-tight">
              Visão geral da operação
            </h2>
            <p className="text-xs text-neutral">
              cobrança, recuperação e esteira de cancelamento
            </p>
          </div>
        </div>
        <Link
          to="/supervisao"
          className={cn(
            buttonVariants({ variant: 'primary' }),
            'px-4 py-2 text-sm',
          )}
        >
          Ir para supervisão
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Em aberto"
          value={formatCurrencyFromDecimalString(
            String(summary.metrics.openAmount),
          )}
          description="aguardando regularização"
          icon={Wallet}
          variant="warning"
          emphasis="primary"
          density="compact"
        />
        <MetricCard
          title="Retido no mês"
          value={formatCurrencyFromDecimalString(
            String(summary.metrics.recoveredMonth),
          )}
          description="confirmado no ciclo"
          icon={TrendingUp}
          variant="success"
          density="compact"
        />
        <MetricCard
          title="Clientes em atraso"
          value={formatInteger(Number(summary.metrics.delinquentCustomers))}
          description="carteira monitorada"
          icon={Users}
          variant="neutral"
          density="compact"
        />
        <MetricCard
          title="Em cobrança"
          value={formatInteger(Number(summary.metrics.inCollection))}
          description="em tratativa ativa"
          icon={Headphones}
          variant="neutral"
          density="compact"
        />
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        <SectionCard title="Precisa de ação" contentClassName="space-y-2 p-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACTION_TONE_CLASSES[action.tone]}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {action.label}
                  </span>
                  <span className="block truncate text-xs text-neutral">
                    {action.helper}
                  </span>
                </span>
                <span className="shrink-0 text-base font-bold tabular-nums">
                  {typeof action.value === 'number'
                    ? formatInteger(action.value)
                    : action.value}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-neutral"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </SectionCard>

        <SectionCard
          title="Carga por atendente"
          description="Casos ativos por atendente (e sem responsável)."
          contentClassName="p-4"
        >
          {portfoliosLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-6 animate-pulse rounded bg-muted/50"
                />
              ))}
            </div>
          ) : agentLoads.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral">
              Sem carteira ativa para exibir.
            </p>
          ) : (
            <div className="space-y-2.5">
              {agentLoads.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-neutral">
                    {item.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        item.unassigned ? 'bg-warning' : 'bg-primary',
                      )}
                      style={{
                        width: `${maxLoad > 0 ? Math.round((item.count / maxLoad) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">
                    {formatInteger(item.count)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
