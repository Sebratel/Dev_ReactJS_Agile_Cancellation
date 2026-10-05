import { PageContainer } from '@/components/navigation/page-container';
import { ErrorState } from '@/components/feedback/error-state';
import { MetricCardSkeleton } from '@/components/feedback/metric-card-skeleton';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { DashboardAgentPanel } from '@/features/dashboard/components/dashboard-agent-panel';
import { DashboardSupervisorPanel } from '@/features/dashboard/components/dashboard-supervisor-panel';
import { useDashboardSummary } from '@/features/dashboard/hooks/use-dashboard-summary';
import { useCollectionCasePortfolios } from '@/features/collection-cases/hooks/use-collection-case-portfolios';
import { useAuth } from '@/features/auth/auth-context';

function DashboardLoadingState() {
  return (
    <>
      <MetricCardSkeleton count={4} />
      <TableSkeleton rows={4} columns={2} />
    </>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const canSeeOperationView =
    session?.user.roles.some(
      (role) => role === 'ADMIN' || role === 'SUPERVISOR',
    ) ?? false;

  const dashboardQuery = useDashboardSummary();
  const portfoliosQuery = useCollectionCasePortfolios(canSeeOperationView);

  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  const handleRetry = () => {
    void dashboardQuery.refetch();
  };

  return (
    <PageContainer>
      {isLoading ? <DashboardLoadingState /> : null}

      {isError ? (
        <ErrorState
          title="Não foi possível carregar o dashboard"
          description="Não foi possível conectar ao servidor. Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!isLoading && !isError && dashboardQuery.data && session ? (
        canSeeOperationView ? (
          <DashboardSupervisorPanel
            summary={dashboardQuery.data}
            portfolios={portfoliosQuery.data?.portfolios ?? []}
            portfoliosLoading={portfoliosQuery.isLoading}
          />
        ) : (
          <DashboardAgentPanel
            user={session.user}
            summary={dashboardQuery.data}
          />
        )
      ) : null}
    </PageContainer>
  );
}
