import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  Hourglass,
  ListChecks,
  PhoneOff,
  TrendingUp,
  User,
} from 'lucide-react';
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

export function DashboardAgentPanel({ user, summary }: DashboardAgentPanelProps) {
  const isCancellationAgent = user.roles.includes('CANCELLATION_AGENT');
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
  const recoveredMonth = formatCurrencyFromDecimalString(
    String(summary.metrics.recoveredMonth),
  );
  const activePromises = Number(summary.metrics.activePromises);

  const recoveryTrend = mapDashboardSummaryToRecoveryTrend(summary);
  const recoveredCases = recoveryTrend.reduce(
    (total, item) => total + item.recoveredCases,
    0,
  );

  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference * (1 - pct / 100);

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
      helper: 'acordo furado, recontatar',
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

      <SectionCard contentClassName="p-4 sm:p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                className="stroke-muted"
                strokeWidth="12"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                className="stroke-success"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">{pct}%</span>
              <span className="text-xs text-neutral">contatados</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-3 text-sm font-bold">Sua carteira hoje</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/55 px-3 py-2.5">
                <p className="text-xs text-neutral">Total</p>
                <p className="text-xl font-bold tabular-nums">{formatInteger(active)}</p>
              </div>
              <div className="rounded-lg bg-success/10 px-3 py-2.5">
                <p className="text-xs text-success">Já contatados</p>
                <p className="text-xl font-bold tabular-nums text-success">
                  {formatInteger(contacted)}
                </p>
              </div>
              <div className="rounded-lg bg-warning/10 px-3 py-2.5">
                <p className="text-xs text-warning">Faltam</p>
                <p className="text-xl font-bold tabular-nums text-warning">
                  {formatInteger(remaining)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

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
                  <span className="block text-sm font-medium">{action.label}</span>
                  <span className="block truncate text-xs text-neutral">
                    {action.helper}
                  </span>
                </span>
                <span className="shrink-0 text-base font-bold tabular-nums">
                  {formatInteger(action.value)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral" aria-hidden="true" />
              </Link>
            );
          })}
        </SectionCard>

        <SectionCard contentClassName="p-4">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <p className="text-sm font-bold">Você recuperou</p>
            <p className="text-xl font-bold tabular-nums text-success">
              {recoveredMonth}
            </p>
          </div>
          <p className="text-xs text-neutral">
            no mês · {formatInteger(recoveredCases)} casos
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-sm text-success">
            <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
            {recoveredCases > 0
              ? 'Bom ritmo — continue priorizando os acordos ativos.'
              : 'Comece pelos contatos de hoje para destravar recuperações.'}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-neutral">Promessas ativas</p>
              <p className="text-xl font-bold tabular-nums">
                {formatInteger(activePromises)}
              </p>
            </div>
            <div className="border-l border-border">
              <p className="text-xs text-neutral">Retidos</p>
              <p className="text-xl font-bold tabular-nums text-success">
                {formatInteger(recoveredCases)}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {!isCancellationAgent ? (
        <SectionCard
          title="Próximos a contatar"
          description="Seus casos ainda sem contato, do maior atraso para o menor."
          contentClassName="p-0"
        >
          {nextToContactQuery.isLoading ? (
            <p className="px-4 py-6 text-sm text-neutral">Carregando sua fila…</p>
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

      {recoveryTrend.length > 0 ? (
        <RecoveryTrendChart data={recoveryTrend} />
      ) : null}
    </div>
  );
}
