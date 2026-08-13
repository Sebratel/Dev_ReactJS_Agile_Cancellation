import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Coins,
  Headphones,
  Hourglass,
  ListChecks,
  ShieldAlert,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  OperationalAlert,
  OperationalSummaryItem,
  RecoveryTrendItem,
  StatusDistributionItem,
} from '@/features/dashboard/types/dashboard.types';
import type { DashboardSummaryResponse } from '@/features/dashboard/types/dashboard-api.types';
import { type AuthUser } from '@/types/auth';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type TriageTone = 'danger' | 'warning' | 'success' | 'neutral';

type TriageMetric = {
  label: string;
  value: string;
  helper: string;
  tone: TriageTone;
};

type TriageCategory = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  story: string;
  metrics: TriageMetric[];
  href: string;
  actionLabel: string;
};

type DashboardTriagePanelProps = {
  alerts: OperationalAlert[];
  canSeeOperationView: boolean;
  recoveryTrend: RecoveryTrendItem[];
  statusDistribution: StatusDistributionItem[];
  summary: DashboardSummaryResponse;
  operationalSummary: OperationalSummaryItem[];
  user: AuthUser;
};

function metricValue(summary: DashboardSummaryResponse, key: keyof DashboardSummaryResponse['metrics']) {
  return summary.metrics[key];
}

function getMetricToneClass(tone: TriageTone) {
  const classes = {
    danger: 'border-danger/20 bg-danger/10 text-danger',
    warning: 'border-primary/25 bg-primary/10 text-primary',
    success: 'border-success/20 bg-success/10 text-success',
    neutral: 'border-border bg-muted/55 text-foreground',
  };

  return classes[tone];
}

function getCategoryAccentClass(tone: TriageTone) {
  const classes = {
    danger: 'bg-danger',
    warning: 'bg-primary',
    success: 'bg-success',
    neutral: 'bg-neutral',
  };

  return classes[tone];
}

function buildSupervisorCategories(
  summary: DashboardSummaryResponse,
): TriageCategory[] {
  return [
    {
      id: 'priorities',
      title: 'Prioridades do dia',
      subtitle: 'Risco imediato',
      icon: ShieldAlert,
      story:
        'Comece por aqui: estes são os pontos com maior chance de virar perda operacional se não forem tratados hoje.',
      href: '/supervisao?priority=HIGH',
      actionLabel: 'Abrir prioridades',
      metrics: [
        {
          label: 'Elegíveis',
          value: formatInteger(Number(metricValue(summary, 'eligibleForCancellation'))),
          helper: 'cancelamento',
          tone: 'danger',
        },
        {
          label: 'Promessas',
          value: formatInteger(Number(metricValue(summary, 'overduePromises'))),
          helper: 'vencidas',
          tone: 'warning',
        },
        {
          label: 'Em aberto',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'openAmount'))),
          helper: 'em risco',
          tone: 'danger',
        },
      ],
    },
    {
      id: 'team',
      title: 'Carteira da equipe',
      subtitle: 'Distribuição',
      icon: Users,
      story:
        'Valide se a operação está distribuída e se existe fila sem movimento antes de cobrar resultado no fim do dia.',
      href: '/supervisao',
      actionLabel: 'Ver carteira',
      metrics: [
        {
          label: 'Clientes',
          value: formatInteger(Number(metricValue(summary, 'delinquentCustomers'))),
          helper: 'em atraso',
          tone: 'neutral',
        },
        {
          label: 'Em cobrança',
          value: formatInteger(Number(metricValue(summary, 'inCollection'))),
          helper: 'ativos',
          tone: 'warning',
        },
        {
          label: 'Ativos',
          value: formatInteger(Number(metricValue(summary, 'activePromises'))),
          helper: 'promessas',
          tone: 'success',
        },
      ],
    },
    {
      id: 'collection',
      title: 'Cobrança',
      subtitle: 'Contato e retorno',
      icon: Headphones,
      story:
        'Acompanhe a pressão da cobrança: volume em tratativa, atraso e acordos que precisam de recontato.',
      href: '/supervisao?status=IN_COLLECTION',
      actionLabel: 'Ver cobrança',
      metrics: [
        {
          label: 'Carteira',
          value: formatInteger(Number(metricValue(summary, 'delinquentCustomers'))),
          helper: 'clientes',
          tone: 'neutral',
        },
        {
          label: 'Tratativa',
          value: formatInteger(Number(metricValue(summary, 'inCollection'))),
          helper: 'em cobrança',
          tone: 'warning',
        },
        {
          label: 'Quebra',
          value: formatInteger(Number(metricValue(summary, 'overduePromises'))),
          helper: 'promessas',
          tone: 'danger',
        },
      ],
    },
    {
      id: 'cancellation',
      title: 'Cancelamento',
      subtitle: 'Esteira crítica',
      icon: ClipboardList,
      story:
        'Aqui ficam os casos que já passaram do esforço de recuperação e precisam de avanço controlado na esteira.',
      href: '/cancelamentos',
      actionLabel: 'Ver cancelamentos',
      metrics: [
        {
          label: 'Andamento',
          value: formatInteger(Number(metricValue(summary, 'cancellationsInProgress'))),
          helper: 'processos',
          tone: 'warning',
        },
        {
          label: 'Elegíveis',
          value: formatInteger(Number(metricValue(summary, 'eligibleForCancellation'))),
          helper: 'novos casos',
          tone: 'danger',
        },
        {
          label: 'Impacto',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'openAmount'))),
          helper: 'carteira',
          tone: 'neutral',
        },
      ],
    },
    {
      id: 'recovery',
      title: 'Recuperação',
      subtitle: 'Resultado',
      icon: Trophy,
      story:
        'Veja se a operação está convertendo esforço em recuperação real e onde reforçar a cadência de acordos.',
      href: '/ranking',
      actionLabel: 'Ver ranking',
      metrics: [
        {
          label: 'Recuperado',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'recoveredMonth'))),
          helper: 'no mês',
          tone: 'success',
        },
        {
          label: 'Ativas',
          value: formatInteger(Number(metricValue(summary, 'activePromises'))),
          helper: 'promessas',
          tone: 'warning',
        },
        {
          label: 'Vencidas',
          value: formatInteger(Number(metricValue(summary, 'overduePromises'))),
          helper: 'revisar',
          tone: 'danger',
        },
      ],
    },
    {
      id: 'financial',
      title: 'Financeiro',
      subtitle: 'Exposição',
      icon: Coins,
      story:
        'Use esta leitura para entender o tamanho financeiro da carteira antes de priorizar mutirões ou redistribuição.',
      href: '/relatorios',
      actionLabel: 'Abrir relatórios',
      metrics: [
        {
          label: 'Aberto',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'openAmount'))),
          helper: 'total',
          tone: 'warning',
        },
        {
          label: 'Recuperado',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'recoveredMonth'))),
          helper: 'mês',
          tone: 'success',
        },
        {
          label: 'Clientes',
          value: formatInteger(Number(metricValue(summary, 'delinquentCustomers'))),
          helper: 'em risco',
          tone: 'neutral',
        },
      ],
    },
  ];
}

function buildAgentCategories(
  summary: DashboardSummaryResponse,
  user: AuthUser,
): TriageCategory[] {
  const isCancellationAgent = user.roles.includes('CANCELLATION_AGENT');
  const workHref = isCancellationAgent ? '/cancelamentos' : '/minha-cobranca';

  return [
    {
      id: 'my-focus',
      title: isCancellationAgent ? 'Minha esteira' : 'Minha fila',
      subtitle: 'Foco imediato',
      icon: ListChecks,
      story:
        'Esta é a sua leitura de começo de turno: comece pelo que está parado, vencido ou com maior chance de recuperação.',
      href: workHref,
      actionLabel: isCancellationAgent ? 'Abrir esteira' : 'Abrir minha fila',
      metrics: [
        {
          label: 'Carteira',
          value: formatInteger(Number(metricValue(summary, 'delinquentCustomers'))),
          helper: 'atribuída',
          tone: 'neutral',
        },
        {
          label: 'Tratativa',
          value: formatInteger(Number(metricValue(summary, 'inCollection'))),
          helper: 'ativa',
          tone: 'warning',
        },
        {
          label: 'Vencidas',
          value: formatInteger(Number(metricValue(summary, 'overduePromises'))),
          helper: 'promessas',
          tone: 'danger',
        },
      ],
    },
    {
      id: 'promises',
      title: 'Minhas promessas',
      subtitle: 'Acordos',
      icon: Hourglass,
      story:
        'Promessa vencida precisa virar nova abordagem rapidamente; promessa ativa precisa de acompanhamento até confirmação.',
      href: workHref,
      actionLabel: 'Revisar promessas',
      metrics: [
        {
          label: 'Ativas',
          value: formatInteger(Number(metricValue(summary, 'activePromises'))),
          helper: 'acompanhar',
          tone: 'warning',
        },
        {
          label: 'Vencidas',
          value: formatInteger(Number(metricValue(summary, 'overduePromises'))),
          helper: 'recontatar',
          tone: 'danger',
        },
        {
          label: 'Aberto',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'openAmount'))),
          helper: 'carteira',
          tone: 'neutral',
        },
      ],
    },
    {
      id: 'result',
      title: 'Meu resultado',
      subtitle: 'Recuperação',
      icon: CheckCircle2,
      story:
        'Acompanhe o quanto sua carteira já converteu no mês e mantenha o foco nos acordos com maior impacto.',
      href: '/relatorios',
      actionLabel: 'Ver resultado',
      metrics: [
        {
          label: 'Recuperado',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'recoveredMonth'))),
          helper: 'no mês',
          tone: 'success',
        },
        {
          label: 'Em aberto',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'openAmount'))),
          helper: 'saldo',
          tone: 'warning',
        },
        {
          label: 'Casos',
          value: formatInteger(Number(metricValue(summary, 'delinquentCustomers'))),
          helper: 'na carteira',
          tone: 'neutral',
        },
      ],
    },
    {
      id: 'cancellation',
      title: 'Cancelamento',
      subtitle: 'Pendências',
      icon: AlertTriangle,
      story:
        'Quando o caso entra em cancelamento, a prioridade é evitar etapa parada e manter o processo rastreável.',
      href: '/cancelamentos',
      actionLabel: 'Ver pendências',
      metrics: [
        {
          label: 'Andamento',
          value: formatInteger(Number(metricValue(summary, 'cancellationsInProgress'))),
          helper: 'processos',
          tone: 'warning',
        },
        {
          label: 'Elegíveis',
          value: formatInteger(Number(metricValue(summary, 'eligibleForCancellation'))),
          helper: 'avaliar',
          tone: 'danger',
        },
        {
          label: 'Impacto',
          value: formatCurrencyFromDecimalString(String(metricValue(summary, 'openAmount'))),
          helper: 'em aberto',
          tone: 'neutral',
        },
      ],
    },
  ];
}

function getCategoryTone(category: TriageCategory): TriageTone {
  return category.metrics.find((metric) => metric.tone === 'danger')?.tone
    ?? category.metrics.find((metric) => metric.tone === 'warning')?.tone
    ?? category.metrics.find((metric) => metric.tone === 'success')?.tone
    ?? 'neutral';
}

export function DashboardTriagePanel({
  alerts,
  canSeeOperationView,
  recoveryTrend,
  statusDistribution,
  summary,
  operationalSummary,
  user,
}: DashboardTriagePanelProps) {
  const categories = useMemo(
    () =>
      canSeeOperationView
        ? buildSupervisorCategories(summary)
        : buildAgentCategories(summary, user),
    [canSeeOperationView, summary, user],
  );
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '');
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ??
    categories[0];

  if (!activeCategory) {
    return null;
  }

  const topAlerts = alerts.filter((alert) => alert.count > 0).slice(0, 3);
  const topStatus = statusDistribution.slice(0, 4);
  const lastRecoveryPoint = recoveryTrend[recoveryTrend.length - 1];
  const selectedTone = getCategoryTone(activeCategory);

  return (
    <SectionCard
      title="Triagem operacional"
      description={
        canSeeOperationView
          ? 'Escolha uma janela de decisão e avance direto para o ponto certo da operação.'
          : 'Escolha uma janela da sua rotina e acompanhe o que precisa de ação.'
      }
      contentClassName="p-0"
    >
      <div className="grid min-h-[430px] min-w-0 2xl:grid-cols-[minmax(260px,310px)_minmax(0,1fr)]">
        <nav
          className="min-w-0 border-b border-border bg-muted/25 p-3 2xl:border-b-0 2xl:border-r"
          aria-label="Categorias da triagem"
        >
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = category.id === activeCategory.id;
              const tone = getCategoryTone(category);

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={cn(
                    'group relative min-w-0 overflow-hidden rounded-lg border px-3 py-3 text-left transition-all duration-200',
                    isActive
                      ? 'border-primary/45 bg-card shadow-card-hover'
                      : 'border-border/80 bg-background/70 hover:border-primary/30 hover:bg-card',
                  )}
                >
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 w-1 transition-opacity',
                      getCategoryAccentClass(tone),
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                        getMetricToneClass(tone),
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {category.title}
                      </span>
                      <span className="block truncate text-xs text-neutral">
                        {category.subtitle}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 space-y-5 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral">
                <BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Janela selecionada
              </div>
              <h3 className="text-2xl font-bold tracking-tight">
                {activeCategory.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral">
                {activeCategory.story}
              </p>
            </div>

            <Link
              to={activeCategory.href}
              className={cn(
                buttonVariants({ variant: 'primary' }),
                'w-full px-4 py-2 text-sm sm:w-auto 2xl:shrink-0',
              )}
            >
              {activeCategory.actionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            {activeCategory.metrics.map((metric) => (
              <div
                key={`${activeCategory.id}-${metric.label}`}
                className="relative min-w-0 overflow-hidden rounded-lg border border-border/80 bg-background px-4 py-4"
              >
                <span
                  className={cn(
                    'absolute inset-x-0 top-0 h-1',
                    getCategoryAccentClass(metric.tone),
                  )}
                  aria-hidden="true"
                />
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral">
                  {metric.label}
                </p>
                <p className="mt-2 break-words text-2xl font-bold tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-neutral">{metric.helper}</p>
              </div>
            ))}
          </div>

          <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
            <div className="min-w-0 rounded-lg border border-border/80 bg-background p-4">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Leitura rápida</p>
                  <p className="text-sm text-neutral">
                    Sinais que ajudam a decidir o próximo clique.
                  </p>
                </div>
                <StatusBadge
                  label={
                    selectedTone === 'danger'
                      ? 'Atenção'
                      : selectedTone === 'success'
                        ? 'Saudável'
                        : 'Monitorar'
                  }
                  variant={selectedTone}
                />
              </div>

              <div className="mt-4 grid gap-2">
                {operationalSummary.slice(0, 3).map((item) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/45 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-neutral">
                        {item.helperText}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-border/80 bg-background p-4">
              <p className="text-sm font-bold">
                {topAlerts.length > 0 ? 'Alertas conectados' : 'Distribuição atual'}
              </p>
              <p className="text-sm text-neutral">
                {topAlerts.length > 0
                  ? 'Pontos relacionados à rotina que merecem acompanhamento.'
                  : 'Sem alerta aberto, acompanhe o desenho da carteira.'}
              </p>

              <div className="mt-4 space-y-2">
                {topAlerts.length > 0
                  ? topAlerts.map((alert) => (
                      <Link
                        key={alert.key}
                        to={alert.supervisionHref ?? activeCategory.href}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 transition-colors hover:border-primary/35 hover:bg-primary/5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {alert.title}
                          </span>
                          <span className="block truncate text-xs text-neutral">
                            {alert.description}
                          </span>
                        </span>
                        <StatusBadge
                          label={`${formatInteger(alert.count)} casos`}
                          variant={alert.variant}
                        />
                      </Link>
                    ))
                  : topStatus.map((item) => (
                      <div
                        key={item.label}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/45 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm font-medium">
                          {item.label}
                        </span>
                        <StatusBadge
                          label={formatInteger(item.count)}
                          variant={item.variant}
                        />
                      </div>
                    ))}
              </div>

              {lastRecoveryPoint ? (
                <p className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                  Última leitura de recuperação: {formatCurrencyFromDecimalString(
                    String(lastRecoveryPoint.recoveredAmount),
                  )}{' '}
                  em {formatInteger(lastRecoveryPoint.recoveredCases)} casos.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
