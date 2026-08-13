import { ChevronDown } from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { MetricCardSkeleton } from '@/components/feedback/metric-card-skeleton';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { buttonVariants, Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardKpiGrid } from '@/features/dashboard/components/dashboard-kpi-grid';
import { DashboardWelcomePanel } from '@/features/dashboard/components/dashboard-welcome-panel';
import { DashboardOperationsSection } from '@/features/dashboard/components/dashboard-operations-section';
import { OperationalAlerts } from '@/features/dashboard/components/operational-alerts';
import { OperationalSummary } from '@/features/dashboard/components/operational-summary';
import { CriticalCasesTable } from '@/features/dashboard/components/critical-cases-table';
import { RecoveryRankingPreview } from '@/features/dashboard/components/recovery-ranking-preview';
import { useDashboardSummary } from '@/features/dashboard/hooks/use-dashboard-summary';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import {
  mapCollectionCaseToCriticalCase,
  mapDashboardSummaryToAlerts,
  mapDashboardSummaryToMetrics,
  mapDashboardSummaryToOperationalSummary,
  mapDashboardSummaryToRecoveryTrend,
  mapDashboardSummaryToStatusDistribution,
} from '@/features/dashboard/utils/dashboard.mapper';
import { useAuth } from '@/features/auth/auth-context';

const StatusDistributionChart = lazy(
  () => import('@/features/dashboard/components/status-distribution-chart'),
);
const RecoveryTrendChart = lazy(
  () => import('@/features/dashboard/components/recovery-trend-chart'),
);

function DashboardChartFallback() {
  return (
    <SectionCard
      title="Carregando visualização"
      description="Preparando a leitura gráfica do dashboard."
    >
      <TableSkeleton rows={4} columns={1} />
    </SectionCard>
  );
}

function DashboardLoadingState() {
  return (
    <>
      <MetricCardSkeleton count={8} />
      <TableSkeleton rows={4} columns={2} />
      <DashboardChartFallback />
    </>
  );
}

type DetailedAnalysisProps = {
  canSeeOperationView: boolean;
  criticalCases: ReturnType<typeof mapCollectionCaseToCriticalCase>[];
  handleRetry: () => void;
  metrics: ReturnType<typeof mapDashboardSummaryToMetrics>;
  recoveryTrend: ReturnType<typeof mapDashboardSummaryToRecoveryTrend>;
  statusDistribution: ReturnType<typeof mapDashboardSummaryToStatusDistribution>;
};

function DetailedAnalysis({
  canSeeOperationView,
  criticalCases,
  handleRetry,
  metrics,
  recoveryTrend,
  statusDistribution,
}: DetailedAnalysisProps) {
  return (
    <details className="group rounded-lg border border-border/80 bg-card shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-bold">Análise detalhada</p>
          <p className="text-sm text-neutral">
            KPIs completos, gráficos, ranking e casos críticos ficam aqui para
            consulta, sem ocupar a primeira leitura do dia.
          </p>
        </div>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-neutral transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="space-y-5 border-t border-border px-5 py-5">
        <DashboardKpiGrid metrics={metrics} />

        {canSeeOperationView ? <DashboardOperationsSection /> : null}

        <section className="grid gap-5 2xl:grid-cols-2">
          <Suspense fallback={<DashboardChartFallback />}>
            <StatusDistributionChart data={statusDistribution} />
          </Suspense>
          <Suspense fallback={<DashboardChartFallback />}>
            <RecoveryTrendChart data={recoveryTrend} />
          </Suspense>
        </section>

        {canSeeOperationView ? <RecoveryRankingPreview /> : null}

        {canSeeOperationView ? (
          criticalCases.length > 0 ? (
            <CriticalCasesTable cases={criticalCases} />
          ) : (
            <EmptyState
              title="Nenhum caso crítico encontrado"
              description="A API não retornou casos prioritários para exibição neste momento."
              actionLabel="Atualizar"
              onAction={handleRetry}
            />
          )
        ) : null}
      </div>
    </details>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const canSeeOperationView =
    session?.user.roles.some((role) => role === 'ADMIN' || role === 'SUPERVISOR') ??
    false;
  const dashboardQuery = useDashboardSummary();
  const criticalCasesQuery = useCollectionCases({
    page: 1,
    limit: 5,
    sortBy: 'daysOverdue',
    sortDirection: 'desc',
  }, { enabled: canSeeOperationView });

  const metrics = useMemo(
    () =>
      dashboardQuery.data
        ? mapDashboardSummaryToMetrics(dashboardQuery.data)
        : [],
    [dashboardQuery.data],
  );

  const operationalSummary = useMemo(
    () =>
      dashboardQuery.data
        ? mapDashboardSummaryToOperationalSummary(dashboardQuery.data)
        : [],
    [dashboardQuery.data],
  );

  const operationalAlerts = useMemo(
    () =>
      dashboardQuery.data
        ? mapDashboardSummaryToAlerts(dashboardQuery.data)
        : [],
    [dashboardQuery.data],
  );

  const statusDistribution = useMemo(
    () =>
      dashboardQuery.data
        ? mapDashboardSummaryToStatusDistribution(dashboardQuery.data)
        : [],
    [dashboardQuery.data],
  );

  const recoveryTrend = useMemo(
    () =>
      dashboardQuery.data
        ? mapDashboardSummaryToRecoveryTrend(dashboardQuery.data)
        : [],
    [dashboardQuery.data],
  );

  const criticalCases = useMemo(
    () =>
      criticalCasesQuery.data?.items.map(mapCollectionCaseToCriticalCase) ?? [],
    [criticalCasesQuery.data],
  );

  const isLoading =
    dashboardQuery.isLoading ||
    (canSeeOperationView && criticalCasesQuery.isLoading);
  const isError =
    dashboardQuery.isError || (canSeeOperationView && criticalCasesQuery.isError);

  const handleRetry = () => {
    void dashboardQuery.refetch();
    void criticalCasesQuery.refetch();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Visão geral"
        description={
          canSeeOperationView
            ? 'Painel operacional consolidado para leitura rápida da cobrança, recuperação e esteira de cancelamento.'
            : 'Painel individual para acompanhar sua rotina, prioridades e resultados do dia.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canSeeOperationView ? (
              <Link
                to="/supervisao"
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'px-3 py-1.5 text-xs',
                )}
              >
                Ir para supervisão
              </Link>
            ) : null}
            <Button onClick={handleRetry} disabled={isLoading}>
              Atualizar indicadores
            </Button>
          </div>
        }
      />

      {isLoading ? <DashboardLoadingState /> : null}

      {isError ? (
        <ErrorState
          title="Não foi possível carregar o dashboard"
          description="Não foi possível conectar ao servidor. Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!isLoading && !isError && dashboardQuery.data ? (
        <>
          {session ? (
            <DashboardWelcomePanel
              user={session.user}
              summary={dashboardQuery.data}
            />
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            <OperationalAlerts
              alerts={operationalAlerts}
              maxItems={4}
              compact
            />
            <OperationalSummary items={operationalSummary} compact />
          </section>

          <DetailedAnalysis
            canSeeOperationView={canSeeOperationView}
            criticalCases={criticalCases}
            handleRetry={handleRetry}
            metrics={metrics}
            recoveryTrend={recoveryTrend}
            statusDistribution={statusDistribution}
          />
        </>
      ) : null}
    </PageContainer>
  );
}
