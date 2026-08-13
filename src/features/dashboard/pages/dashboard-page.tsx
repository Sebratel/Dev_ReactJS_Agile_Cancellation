import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { PageContainer } from '@/components/navigation/page-container';
import { ErrorState } from '@/components/feedback/error-state';
import { MetricCardSkeleton } from '@/components/feedback/metric-card-skeleton';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { buttonVariants, Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardWelcomePanel } from '@/features/dashboard/components/dashboard-welcome-panel';
import { DashboardTriagePanel } from '@/features/dashboard/components/dashboard-triage-panel';
import { useDashboardSummary } from '@/features/dashboard/hooks/use-dashboard-summary';
import {
  mapDashboardSummaryToAlerts,
  mapDashboardSummaryToOperationalSummary,
  mapDashboardSummaryToRecoveryTrend,
  mapDashboardSummaryToStatusDistribution,
} from '@/features/dashboard/utils/dashboard.mapper';
import { useAuth } from '@/features/auth/auth-context';

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
  const { session } = useAuth();
  const canSeeOperationView =
    session?.user.roles.some((role) => role === 'ADMIN' || role === 'SUPERVISOR') ??
    false;
  const dashboardQuery = useDashboardSummary();

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

  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  const handleRetry = () => {
    void dashboardQuery.refetch();
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

          {session ? (
            <DashboardTriagePanel
              alerts={operationalAlerts}
              canSeeOperationView={canSeeOperationView}
              operationalSummary={operationalSummary}
              recoveryTrend={recoveryTrend}
              statusDistribution={statusDistribution}
              summary={dashboardQuery.data}
              user={session.user}
            />
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
}
