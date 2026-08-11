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

export default function DashboardPage() {
  const dashboardQuery = useDashboardSummary();
  const criticalCasesQuery = useCollectionCases({
    page: 1,
    limit: 5,
    sortBy: 'daysOverdue',
    sortDirection: 'desc',
  });

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

  const isLoading = dashboardQuery.isLoading || criticalCasesQuery.isLoading;
  const isError = dashboardQuery.isError || criticalCasesQuery.isError;

  const handleRetry = () => {
    void dashboardQuery.refetch();
    void criticalCasesQuery.refetch();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Visão geral"
        description="Painel operacional consolidado para leitura rápida da cobrança, recuperação e esteira de cancelamento."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/supervisao"
              className={cn(
                buttonVariants({ variant: 'secondary' }),
                'px-3 py-1.5 text-xs',
              )}
            >
              Ir para supervisão
            </Link>
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
          <DashboardKpiGrid metrics={metrics} />

          <OperationalAlerts alerts={operationalAlerts} />

          <DashboardOperationsSection />

          <OperationalSummary items={operationalSummary} />

          <section className="grid gap-6 2xl:grid-cols-2">
            <Suspense fallback={<DashboardChartFallback />}>
              <StatusDistributionChart data={statusDistribution} />
            </Suspense>
            <Suspense fallback={<DashboardChartFallback />}>
              <RecoveryTrendChart data={recoveryTrend} />
            </Suspense>
          </section>

          <RecoveryRankingPreview />

          {criticalCases.length > 0 ? (
            <CriticalCasesTable cases={criticalCases} />
          ) : (
            <EmptyState
              title="Nenhum caso crítico encontrado"
              description="A API não retornou casos prioritários para exibição neste momento."
              actionLabel="Atualizar"
              onAction={handleRetry}
            />
          )}
        </>
      ) : null}
    </PageContainer>
  );
}
