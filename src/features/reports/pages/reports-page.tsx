import { lazy, Suspense, useMemo } from 'react';
import { Download, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { PageContainer } from '@/components/navigation/page-container';
import { ErrorState } from '@/components/feedback/error-state';
import { MetricCardSkeleton } from '@/components/feedback/metric-card-skeleton';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useDashboardSummary } from '@/features/dashboard/hooks/use-dashboard-summary';
import {
  mapDashboardSummaryToMetrics,
  mapDashboardSummaryToRecoveryTrend,
  mapDashboardSummaryToStatusDistribution,
} from '@/features/dashboard/utils/dashboard.mapper';
import { useExportCasesCsv } from '@/features/collection-cases/hooks/use-export-cases-csv';
import { usePaymentPromisesSummary } from '@/features/payment-promises/hooks/use-payment-promises-summary';
import { useRecoveryRanking } from '@/features/ranking/hooks/use-recovery-ranking';
import { formatCurrencyFromDecimalString, formatInteger } from '@/utils/formatters';

const StatusDistributionChart = lazy(
  () => import('@/features/dashboard/components/status-distribution-chart'),
);
const RecoveryTrendChart = lazy(
  () => import('@/features/dashboard/components/recovery-trend-chart'),
);

function ChartFallback() {
  return (
    <SectionCard
      title="Carregando visualização"
      description="Preparando o gráfico do relatório."
    >
      <TableSkeleton rows={4} columns={1} />
    </SectionCard>
  );
}

export default function ReportsPage() {
  const dashboardQuery = useDashboardSummary();
  const promisesSummaryQuery = usePaymentPromisesSummary();
  const rankingQuery = useRecoveryRanking('current_month');
  const { exportCsv, isExporting } = useExportCasesCsv();

  const metrics = useMemo(
    () => (dashboardQuery.data ? mapDashboardSummaryToMetrics(dashboardQuery.data) : []),
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
      dashboardQuery.data ? mapDashboardSummaryToRecoveryTrend(dashboardQuery.data) : [],
    [dashboardQuery.data],
  );

  const topAgents = (rankingQuery.data?.ranking ?? []).slice(0, 5);

  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  const handleRetry = () => {
    void dashboardQuery.refetch();
    void promisesSummaryQuery.refetch();
    void rankingQuery.refetch();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Relatórios"
        description="Indicadores executivos, tendências e extrações para a operação financeira."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => { void exportCsv({}, 'relatorio-carteira.csv'); }}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar carteira completa'}
            </Button>
            <Button onClick={handleRetry} disabled={isLoading}>
              Atualizar
            </Button>
          </>
        }
      />

      {isLoading ? (
        <>
          <MetricCardSkeleton count={8} />
          <TableSkeleton rows={4} columns={2} />
        </>
      ) : null}

      {isError ? (
        <ErrorState
          title="Não foi possível carregar os indicadores"
          description="Não foi possível conectar ao servidor. Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!isLoading && !isError && dashboardQuery.data ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 card-stagger">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                title={metric.title}
                value={metric.value}
                description={metric.description}
                variant={metric.variant}
                emphasis={metric.emphasis}
              />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 card-stagger">
            <MetricCard
              title="Promessas vencidas"
              value={formatInteger(promisesSummaryQuery.data?.overdue ?? 0)}
              description="Acordos ativos com data ultrapassada"
              variant={
                promisesSummaryQuery.data && promisesSummaryQuery.data.overdue > 0
                  ? 'danger'
                  : 'neutral'
              }
              loading={promisesSummaryQuery.isLoading}
            />
            <MetricCard
              title="Promessas cumpridas no mês"
              value={formatInteger(promisesSummaryQuery.data?.fulfilledThisMonth ?? 0)}
              description="Acordos honrados no mês atual"
              variant="success"
              loading={promisesSummaryQuery.isLoading}
            />
          </div>

          <section className="grid gap-6 2xl:grid-cols-2">
            <Suspense fallback={<ChartFallback />}>
              <StatusDistributionChart data={statusDistribution} />
            </Suspense>
            <Suspense fallback={<ChartFallback />}>
              <RecoveryTrendChart data={recoveryTrend} />
            </Suspense>
          </section>

          <SectionCard
            title="Produtividade por agente"
            description="Top colaboradores por receita recuperada neste mês."
            contentClassName="p-0"
          >
            {topAgents.length > 0 ? (
              <TableContainer flush>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className="w-16">#</TableHeaderCell>
                      <TableHeaderCell>Colaborador</TableHeaderCell>
                      <TableHeaderCell align="right">Casos recuperados</TableHeaderCell>
                      <TableHeaderCell align="right">Receita recuperada</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topAgents.map((item) => (
                      <TableRow key={item.userId}>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                              item.rank === 1
                                ? 'bg-primary text-foreground'
                                : 'bg-muted text-neutral',
                            )}
                          >
                            {item.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell numeric>{formatInteger(item.recoveredCases)}</TableCell>
                        <TableCell numeric className="font-semibold">
                          {formatCurrencyFromDecimalString(item.recoveredAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-neutral lg:px-6">
                Nenhuma recuperação registrada neste mês ainda.
              </p>
            )}

            <div className="border-t border-border px-4 py-3 lg:px-6">
              <Link
                to="/ranking"
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'sm' }),
                  'inline-flex items-center gap-1.5',
                )}
              >
                <Trophy className="h-4 w-4" />
                Ver ranking completo
              </Link>
            </div>
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}
