import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  Hourglass,
  Briefcase,
  Handshake,
  ListChecks,
  PhoneOff,
  TrendingUp,
  User,
} from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { SectionCard } from '@/components/data-display/section-card';
import RecoveryTrendChart from '@/features/dashboard/components/recovery-trend-chart';
import { mapDashboardSummaryToRecoveryTrend } from '@/features/dashboard/utils/dashboard.mapper';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { type DashboardSummaryResponse } from '@/features/dashboard/types/dashboard-api.types';
import { type AuthUser } from '@/types/auth';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type DashboardAgentPanelProps = {
  user: AuthUser;
  summary: DashboardSummaryResponse;
};

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'você';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

type AgentActionTone = 'danger' | 'warning' | 'neutral';

const ACTION_TONE_CLASSES: Record<AgentActionTone, string> = {
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  neutral: 'border border-border text-foreground',
};

const WORK_HREF = '/minha-cobranca';

export function DashboardAgentPanel({
  user,
  summary,
}: DashboardAgentPanelProps) {
  // Quem acumula os dois papéis vê o painel de cobrança; a tela de
  // Cancelamentos continua acessível pelo menu.
  const isCancellationAgent =
    user.roles.includes('CANCELLATION_AGENT') &&
    !user.roles.includes('COLLECTION_AGENT');
  const workHref = isCancellationAgent ? '/cancelamentos' : WORK_HREF;

  // Próximos a contatar: casos DELE ainda sem contato manual, do mais crítico
  // (maior atraso) para o menor. Só faz sentido para o atendente de cobrança.
  const nextToContactQuery = useCollectionCases(
    {
      assignedToId: user.id,
      interactionStatus: 'not_contacted',
      limit: 4,
      sortBy: 'daysOverdue',
      sortDirection: 'desc',
    },
    { enabled: !isCancellationAgent && Boolean(user.id) },
  );
  const nextToContact = nextToContactQuery.data?.items ?? [];

  const active = Number(summary.metrics.assignedActiveCases);
  const contacted = Number(summary.metrics.contactedCases);
  const remaining = Math.max(active - contacted, 0);
  const pct = active > 0 ? Math.round((contacted / active) * 100) : 0;

  const overduePromises = Number(summary.metrics.overduePromises);
  const dueTodayAlert = summary.operationalAlerts.find(
    (alert) => alert.key === 'promisesDueToday',
  );
  const promisesDueToday = dueTodayAlert?.count ?? 0;
  const paidMonth = Number(summary.metrics.recoveredMonth) || 0;
  // Backend antigo (durante um deploy) pode não enviar o campo: mostra "—" em
  // vez de R$ 0,00, que seria um dado falso.
  const hasContactBreakdown =
    summary.metrics.recoveredAfterContactMonth !== undefined;
  const recoveredAfterContact =
    Number(summary.metrics.recoveredAfterContactMonth) || 0;
  const paidOnOwn = Math.max(paidMonth - recoveredAfterContact, 0);
  const overduePromisesPaid = Number(summary.metrics.overduePromisesPaid ?? 0);
  const activePromises = Number(summary.metrics.activePromises);

  const recoveryTrend = mapDashboardSummaryToRecoveryTrend(summary);

  const actions: Array<{
    label: string;
    helper: string;
    value: number;
    tone: AgentActionTone;
    icon: typeof Hourglass;
    href: string;
  }> = [
    {
      label: 'Promessas vencidas',
      helper:
        overduePromisesPaid > 0
          ? `acordo furado · ${formatInteger(overduePromisesPaid)} já pagaram`
          : 'acordo furado, recontatar',
      value: overduePromises,
      tone: 'danger',
      icon: Hourglass,
      href: workHref,
    },
    {
      label: 'Promessas vencem hoje',
      helper: 'confirmar pagamento',
      value: promisesDueToday,
      tone: 'warning',
      icon: CalendarClock,
      href: workHref,
    },
    {
      label: 'Ainda sem contato',
      helper: 'começar a trabalhar',
      value: remaining,
      tone: 'neutral',
      icon: PhoneOff,
      href: `${WORK_HREF}?interactionStatus=not_contacted`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          Você
        </span>
        <div>
          <h2 className="text-xl font-bold leading-tight">
            {getGreeting()}, {getFirstName(user.name)}
          </h2>
          <p className="text-xs text-neutral">seu acompanhamento de hoje</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Minha carteira"
          value={formatInteger(active)}
          description={`${formatInteger(contacted)} já contatados (${pct}%)`}
          icon={Briefcase}
          variant="neutral"
          density="compact"
        />
        <MetricCard
          title="Recuperado no mês"
          value={
            hasContactBreakdown
              ? formatCurrencyFromDecimalString(
                  String(summary.metrics.recoveredAfterContactMonth),
                )
              : '—'
          }
          description={
            hasContactBreakdown
              ? `pago após seu contato · ${formatCurrencyFromDecimalString(String(paidOnOwn))} pagaram sozinhos`
              : 'pago após seu contato'
          }
          icon={TrendingUp}
          variant="success"
          density="compact"
        />
        <MetricCard
          title="Promessas ativas"
          value={formatInteger(activePromises)}
          description="acordos em andamento"
          icon={Handshake}
          variant="neutral"
          density="compact"
        />
        <MetricCard
          title="Ainda sem contato"
          value={formatInteger(remaining)}
          description="casos da sua carteira para começar"
          icon={PhoneOff}
          variant="warning"
          density="compact"
        />
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        <SectionCard title="Pra fazer hoje" contentClassName="space-y-2 p-4">
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
                  {formatInteger(action.value)}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-neutral"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </SectionCard>

        {recoveryTrend.length > 0 ? (
          <RecoveryTrendChart data={recoveryTrend} />
        ) : null}
      </div>

      {!isCancellationAgent ? (
        <SectionCard
          title="Próximos a contatar"
          description="Seus casos ainda sem contato, do maior atraso para o menor."
          contentClassName="p-0"
        >
          {nextToContactQuery.isLoading ? (
            <p className="px-4 py-6 text-sm text-neutral">
              Carregando sua fila…
            </p>
          ) : nextToContact.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-success">
              <ListChecks className="h-4 w-4 shrink-0" aria-hidden="true" />
              Nenhum caso pendente de contato. Carteira em dia!
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {nextToContact.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.customerName}
                      </span>
                      <span className="block truncate text-xs text-neutral">
                        {formatInteger(item.daysOverdue)} dias em atraso ·{' '}
                        {item.contractCode}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrencyFromDecimalString(item.outstandingAmount)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border px-4 py-3">
                <Link
                  to={`${WORK_HREF}?interactionStatus=not_contacted`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Abrir minha fila
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
