import { ArrowRight, Headphones, Radio, Sparkles } from 'lucide-react';
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
      actionLabel: 'Abrir supervisão',
      actionHref: '/supervisao',
    };
  }

  if (user.roles.includes('CANCELLATION_AGENT')) {
    return {
      message: 'A esteira de cancelamento está organizada para você acompanhar as próximas etapas.',
      actionLabel: 'Ver cancelamentos',
      actionHref: '/cancelamentos',
    };
  }

  if (user.roles.includes('COLLECTION_AGENT')) {
    return {
      message: 'Sua carteira foi priorizada para facilitar os contatos mais importantes do dia.',
      actionLabel: 'Ver minha fila',
      actionHref: '/minha-cobranca',
    };
  }

  return {
    message: 'Acompanhe os indicadores principais e mantenha a operação sob controle.',
    actionLabel: 'Ver relatórios',
    actionHref: '/relatorios',
  };
}

export function DashboardWelcomePanel({
  user,
  summary,
}: DashboardWelcomePanelProps) {
  const tone = getWelcomeTone(user);
  const firstName = getFirstName(user.name);

  const highlights = [
    {
      label: 'Clientes em atraso',
      value: formatInteger(Number(summary.metrics.delinquentCustomers)),
    },
    {
      label: 'Promessas vencidas',
      value: formatInteger(Number(summary.metrics.overduePromises)),
    },
    {
      label: 'Valor em aberto',
      value: formatCurrencyFromDecimalString(String(summary.metrics.openAmount)),
    },
  ];

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

      <div className="relative grid gap-5 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {roleLabels[user.role]}
          </div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight">
            {getGreeting()}, {firstName}.
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral">
            {tone.message}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border/70 bg-background/70 px-3 py-2"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral">
                  {item.label}
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span
              className="absolute inset-2 animate-ping rounded-full border border-primary/25"
              aria-hidden="true"
            />
            <Radio
              className="absolute right-3 top-3 h-4 w-4 text-danger"
              aria-hidden="true"
            />
            <Headphones className="relative h-8 w-8" aria-hidden="true" />
          </div>

          <Link
            to={tone.actionHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-primary/90"
          >
            {tone.actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
