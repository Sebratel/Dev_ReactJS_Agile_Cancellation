import { useMemo } from 'react';
import { SectionCard } from '@/components/data-display/section-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { MetricCardSkeleton } from '@/components/feedback/metric-card-skeleton';
import { OperationalMetricsGrid } from '@/features/dashboard/components/operational-metrics-grid';
import { useDashboardOperations } from '@/features/dashboard/hooks/use-dashboard-operations';
import {
  isDashboardOperationsEmpty,
  mapDashboardOperationsToGroups,
} from '@/features/dashboard/utils/dashboard.mapper';

export function DashboardOperationsSection() {
  const operationsQuery = useDashboardOperations();

  const groups = useMemo(
    () =>
      operationsQuery.data
        ? mapDashboardOperationsToGroups(operationsQuery.data)
        : [],
    [operationsQuery.data],
  );

  const handleRetry = () => {
    void operationsQuery.refetch();
  };

  if (operationsQuery.isLoading) {
    return (
      <SectionCard
        title="Dashboard operacional"
        description="Indicadores consolidados de cobrança, promessas, cancelamentos e finanças."
      >
        <MetricCardSkeleton count={4} />
      </SectionCard>
    );
  }

  if (operationsQuery.isError) {
    return (
      <SectionCard
        title="Dashboard operacional"
        description="Indicadores consolidados de cobrança, promessas, cancelamentos e finanças."
      >
        <ErrorState
          title="Não foi possível carregar o dashboard operacional"
          description="Verifique se o backend está disponível e tente novamente."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      </SectionCard>
    );
  }

  if (
    operationsQuery.data &&
    isDashboardOperationsEmpty(operationsQuery.data)
  ) {
    return (
      <SectionCard
        title="Dashboard operacional"
        description="Indicadores consolidados de cobrança, promessas, cancelamentos e finanças."
      >
        <EmptyState
          title="Nenhum dado operacional disponível"
          description="Ainda não há casos ou movimentações suficientes para compor os indicadores."
          actionLabel="Atualizar"
          onAction={handleRetry}
        />
      </SectionCard>
    );
  }

  return (
    <section aria-label="Dashboard operacional" className="space-y-2">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Dashboard operacional
        </h2>
        <p className="text-sm text-neutral">
          Indicadores consolidados de cobrança, promessas, cancelamentos e
          finanças.
        </p>
      </div>
      <OperationalMetricsGrid groups={groups} />
    </section>
  );
}
