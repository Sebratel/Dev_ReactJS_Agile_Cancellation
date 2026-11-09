import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Hourglass,
  Inbox,
  Repeat,
  ShieldAlert,
  TrendingUp,
  Users,
  UserX,
  Wallet,
  Clock,
} from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SupervisorActionsCard,
  type SupervisorAction,
} from '@/features/dashboard/components/supervisor-actions-card';
import { SupervisorHsmCard } from '@/features/dashboard/components/supervisor-hsm-card';
import { SupervisorLoadCard } from '@/features/dashboard/components/supervisor-load-card';
import { SupervisorRecoveryCard } from '@/features/dashboard/components/supervisor-recovery-card';
import { SupervisorTopRecoverersCard } from '@/features/dashboard/components/supervisor-top-recoverers-card';
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

function toNumber(value: number | string | undefined) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function DashboardSupervisorPanel({
  summary,
  portfolios,
  portfoliosLoading,
}: DashboardSupervisorPanelProps) {
  const { metrics } = summary;
  const unassigned = portfolios.find((portfolio) => portfolio.agent === null);
  const inactiveAgents =
    summary.operationalAlerts.find((alert) => alert.key === 'inactiveAgents')
      ?.count ?? 0;

  // Mesma fonte da aba Renegociados (ERP). Indisponível != 0.
  const renegotiationQuery = useRenegotiationSummary();
  const renegotiationData = renegotiationQuery.data;
  const renegotiatedOpen: SupervisorAction['value'] =
    renegotiationData?.available === true
      ? renegotiationData.count
      : renegotiationQuery.isLoading
        ? 'loading'
        : 'unavailable';

  const overduePromisesPaid = toNumber(metrics.overduePromisesPaid);

  const actions: SupervisorAction[] = [
    {
      key: 'eligible',
      label: 'Elegíveis p/ cancelamento',
      helper: 'esforço de recuperação esgotado',
      value: toNumber(metrics.eligibleForCancellation),
      tone: 'danger',
      icon: ShieldAlert,
      href: '/supervisao?status=ELIGIBLE_FOR_CANCELLATION',
    },
    {
      key: 'overduePromises',
      label: 'Promessas vencidas',
      helper:
        overduePromisesPaid > 0
          ? `acordo furado · ${formatInteger(overduePromisesPaid)} já pagaram`
          : 'acordo furado, sem recontato',
      value: toNumber(metrics.overduePromises),
      tone: 'danger',
      icon: Hourglass,
      href: '/promessas?status=ACTIVE&caseSituation=IN_COLLECTION',
    },
    {
      key: 'unassigned',
      label: 'Sem responsável',
      helper: 'fila esperando distribuição',
      value: unassigned?.totalActive ?? 0,
      tone: 'warning',
      icon: Inbox,
      href: '/supervisao?assignedToId=unassigned',
    },
    {
      key: 'renegotiated',
      label: 'Renegociados em aberto',
      helper: 'renegociaram e ainda devem',
      value: renegotiatedOpen,
      tone: 'warning',
      icon: Repeat,
      href: '/supervisao',
    },
    {
      key: 'inactiveAgents',
      label: 'Atendentes sem movimento hoje',
      helper: 'sem contato registrado hoje',
      value: inactiveAgents,
      tone: 'neutral',
      icon: UserX,
      href: '/supervisao',
    },
  ];

  const activeCases = toNumber(metrics.assignedActiveCases);
  const paidMonth = toNumber(metrics.recoveredMonth);
  // Backend antigo (durante um deploy) pode não enviar o campo: mostra "—" em
  // vez de R$ 0,00, que seria um dado falso.
  const hasContactBreakdown = metrics.recoveredAfterContactMonth !== undefined;
  const recoveredAfterContact = toNumber(metrics.recoveredAfterContactMonth);
  // O restante das faturas pagas no mês pagou sem contato de atendente.
  const paidOnOwn = Math.max(paidMonth - recoveredAfterContact, 0);
  const waitingTriage =
    summary.statusDistribution.find((item) => item.status === 'WAITING_TRIAGE')
      ?.count ?? 0;

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
          value={formatCurrencyFromDecimalString(String(metrics.openAmount))}
          description={`saldo dos ${formatInteger(activeCases)} casos ativos`}
          icon={Wallet}
          variant="neutral"
          density="compact"
        />
        <MetricCard
          title="Recuperado no mês"
          value={
            hasContactBreakdown
              ? formatCurrencyFromDecimalString(
                  String(metrics.recoveredAfterContactMonth),
                )
              : '—'
          }
          description={
            hasContactBreakdown
              ? `pago após contato · ${formatCurrencyFromDecimalString(String(paidOnOwn))} pagaram sozinhos`
              : 'pago após contato'
          }
          icon={TrendingUp}
          variant="success"
          density="compact"
        />
        <MetricCard
          title="Clientes em atraso"
          value={formatInteger(toNumber(metrics.delinquentCustomers))}
          description={`clientes com caso ativo (${formatInteger(activeCases)} casos)`}
          icon={Users}
          variant="neutral"
          density="compact"
        />
        <MetricCard
          title="Aguardando triagem"
          value={formatInteger(waitingTriage)}
          description={`${formatInteger(toNumber(metrics.inCollection))} em cobrança · ${formatInteger(toNumber(metrics.cancellationsInProgress))} em cancelamento`}
          icon={Clock}
          variant="neutral"
          density="compact"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SupervisorActionsCard
          actions={actions}
          onRetry={() => {
            void renegotiationQuery.refetch();
          }}
        />
        <SupervisorLoadCard
          portfolios={portfolios}
          isLoading={portfoliosLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SupervisorRecoveryCard trend={summary.recoveryTrend} />
        <SupervisorTopRecoverersCard />
        <SupervisorHsmCard />
      </div>
    </div>
  );
}
