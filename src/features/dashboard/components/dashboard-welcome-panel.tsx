import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Headphones,
  Radio,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { roleLabels } from '@/features/auth/auth.constants';
import { type DashboardSummaryResponse } from '@/features/dashboard/types/dashboard-api.types';
import { type AuthUser } from '@/types/auth';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type DashboardWelcomePanelProps = {
  user: AuthUser;
  summary: DashboardSummaryResponse;
};

type WelcomeTone = {
  message: string;
  actionLabel: string;
  actionHref: string;
  scopeLabel: string;
};

type Highlight = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: 'danger' | 'warning' | 'success' | 'neutral';
};

type ActionItem = {
  label: string;
  description: string;
  value: string;
  href: string;
  tone: 'danger' | 'warning' | 'success' | 'neutral';
};

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'time';
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getWelcomeTone(user: AuthUser): WelcomeTone {
  if (user.roles.includes('SUPERVISOR') || user.roles.includes('ADMIN')) {
    return {
      message: 'Sua operação está pronta para acompanhamento. Comece pelos pontos que exigem prioridade.',
      actionLabel: 'Abrir casos prioritários',
      actionHref: '/supervisao',
      scopeLabel: 'Briefing da operação',
    };
  }

  if (user.roles.includes('CANCELLATION_AGENT')) {
    return {
      message: 'Sua esteira mostra o que precisa avançar hoje e os gargalos da sua carteira.',
      actionLabel: 'Ver cancelamentos',
      actionHref: '/cancelamentos',
      scopeLabel: 'Minha rotina',
    };
  }

  if (user.roles.includes('COLLECTION_AGENT')) {
    return {
      message: 'Sua carteira está organizada para priorizar contato, promessa vencida e recuperação.',
      actionLabel: 'Ver minha fila',
      actionHref: '/minha-cobranca',
      scopeLabel: 'Minha rotina',
    };
  }

  return {
    message: 'Acompanhe os indicadores principais e mantenha a operação sob controle.',
    actionLabel: 'Ver relatórios',
    actionHref: '/relatorios',
    scopeLabel: 'Resumo liberado',
  };
}

function isSupervisorView(user: AuthUser) {
  return user.roles.includes('SUPERVISOR') || user.roles.includes('ADMIN');
}

function getHighlights(
  summary: DashboardSummaryResponse,
  supervisorView: boolean,
): Highlight[] {
  const portfolioLabel = supervisorView
    ? 'Clientes em atraso'
    : 'Minha carteira';

  return [
    {
      label: portfolioLabel,
      value: formatInteger(Number(summary.metrics.delinquentCustomers)),
      helper: supervisorView ? 'Base total monitorada' : 'Clientes atribuídos a você',
      icon: Users,
      tone: 'danger',
    },
    {
      label: 'Valor em aberto',
      value: formatCurrencyFromDecimalString(String(summary.metrics.openAmount)),
      helper: supervisorView ? 'Impacto financeiro total' : 'Saldo da sua carteira',
      icon: BadgeDollarSign,
      tone: 'warning',
    },
    {
      label: 'Promessas vencidas',
      value: formatInteger(Number(summary.metrics.overduePromises)),
      helper: 'Exigem reabordagem hoje',
      icon: Clock3,
      tone: 'danger',
    },
    {
      label: supervisorView ? 'Em cancelamento' : 'Recuperado no mês',
      value: supervisorView
        ? formatInteger(Number(summary.metrics.cancellationsInProgress))
        : formatCurrencyFromDecimalString(String(summary.metrics.recoveredMonth)),
      helper: supervisorView ? 'Processos ativos' : 'Resultado da sua carteira',
      icon: supervisorView ? AlertTriangle : CheckCircle2,
      tone: supervisorView ? 'neutral' : 'success',
    },
  ];
}

function getActionItems(
  summary: DashboardSummaryResponse,
  supervisorView: boolean,
  user: AuthUser,
): ActionItem[] {
  if (supervisorView) {
    return [
      {
        label: 'Elegíveis para cancelamento',
        description: 'Casos críticos aguardando decisão da supervisão.',
        value: formatInteger(Number(summary.metrics.eligibleForCancellation)),
        href: '/supervisao?status=ELIGIBLE_FOR_CANCELLATION',
        tone: 'danger',
      },
      {
        label: 'Promessas vencidas',
        description: 'Acordos quebrados que precisam de nova abordagem.',
        value: formatInteger(Number(summary.metrics.overduePromises)),
        href: '/supervisao?alert=overduePromises',
        tone: 'warning',
      },
      {
        label: 'Em cobrança',
        description: 'Volume ativo distribuído para tratativa.',
        value: formatInteger(Number(summary.metrics.inCollection)),
        href: '/supervisao?status=IN_COLLECTION',
        tone: 'neutral',
      },
    ];
  }

  const isCancellationAgent = user.roles.includes('CANCELLATION_AGENT');

  return [
    {
      label: isCancellationAgent ? 'Processos em andamento' : 'Contatos do dia',
      description: isCancellationAgent
        ? 'Avance etapas pendentes da sua carteira.'
        : 'Comece pelos clientes com maior risco e atraso.',
      value: isCancellationAgent
        ? formatInteger(Number(summary.metrics.cancellationsInProgress))
        : formatInteger(Number(summary.metrics.inCollection)),
      href: isCancellationAgent ? '/cancelamentos' : '/minha-cobranca',
      tone: 'warning',
    },
    {
      label: 'Promessas vencidas',
      description: 'Reabra contato antes de evoluir o status do caso.',
      value: formatInteger(Number(summary.metrics.overduePromises)),
      href: isCancellationAgent ? '/cancelamentos' : '/minha-cobranca',
      tone: 'danger',
    },
    {
      label: 'Resultado no mês',
      description: 'Valor recuperado em casos atribuídos a você.',
      value: formatCurrencyFromDecimalString(String(summary.metrics.recoveredMonth)),
      href: '/relatorios',
      tone: 'success',
    },
  ];
}

function getToneClasses(tone: Highlight['tone']) {
  const classes = {
    danger: 'border-danger/20 bg-danger/10 text-danger',
    warning: 'border-primary/25 bg-primary/10 text-primary',
    success: 'border-success/20 bg-success/10 text-success',
    neutral: 'border-border bg-muted/60 text-neutral',
  };

  return classes[tone];
}

export function DashboardWelcomePanel({
  user,
  summary,
}: DashboardWelcomePanelProps) {
  const tone = getWelcomeTone(user);
  const firstName = getFirstName(user.name);
  const supervisorView = isSupervisorView(user);
  const highlights = getHighlights(summary, supervisorView);
  const actionItems = getActionItems(summary, supervisorView, user);
  const openIssues = actionItems.filter((item) => item.tone !== 'success')
    .length;

  return (
    <section className="relative overflow-hidden rounded-lg border border-border/80 bg-card shadow-card">
      <div
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-danger via-primary to-primary"
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative grid min-w-0 gap-5 px-4 py-4 sm:px-5 sm:py-5 2xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <div className="min-w-0 space-y-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {roleLabels[user.role]}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral">
              {tone.scopeLabel}
            </p>
            <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight">
              {getGreeting()}, {firstName}.
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral">
              {tone.message}
            </p>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-lg border border-border/70 bg-background/75 px-3 py-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${getToneClasses(
                      item.tone,
                    )}`}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral">
                      {item.label}
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums">
                      {item.value}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral">
                      {item.helper}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-background/80 p-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral">
                {supervisorView ? 'O que fazer agora' : 'Seu foco agora'}
              </p>
              <h3 className="mt-1 text-lg font-bold">
                {openIssues} pontos exigem atenção
              </h3>
            </div>
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span
                className="absolute inset-2 animate-ping rounded-full border border-primary/25"
                aria-hidden="true"
              />
              {supervisorView ? (
                <Radio
                  className="absolute right-2 top-2 h-3.5 w-3.5 text-danger"
                  aria-hidden="true"
                />
              ) : null}
              {supervisorView ? (
                <Headphones className="relative h-6 w-6" aria-hidden="true" />
              ) : (
                <Target className="relative h-6 w-6" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {actionItems.map((item, index) => (
              <Link
                key={item.label}
                to={item.href}
                className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-3 transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${getToneClasses(
                    item.tone,
                  )}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-neutral">
                    {item.description}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums">
                  {item.value}
                </span>
                <ArrowRight
                  className="h-4 w-4 text-neutral transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>

          <Link
            to={tone.actionHref}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-primary/90"
          >
            {tone.actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
