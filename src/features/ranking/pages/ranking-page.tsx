import { useState } from 'react';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button } from '@/components/ui/button';
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
import { RecoveryRankingPodium } from '@/features/ranking/components/recovery-ranking-podium';
import { useRecoveryRanking } from '@/features/ranking/hooks/use-recovery-ranking';
import { type RecoveryRankingPeriod } from '@/features/ranking/types/ranking-api.types';
import {
  RECOVERY_RANKING_PERIOD_OPTIONS,
  getRecoveryRankingPeriodLabel,
} from '@/features/ranking/utils/ranking-labels';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

export default function RankingPage() {
  const [period, setPeriod] = useState<RecoveryRankingPeriod>('current_month');
  const rankingQuery = useRecoveryRanking(period);

  const handleRetry = () => {
    void rankingQuery.refetch();
  };

  const ranking = rankingQuery.data?.ranking ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Ranking de recuperação"
        description="Colaboradores ordenados pela receita salva ao reverter cancelamentos, do maior para o menor valor recuperado."
      >
        <div
          className="flex flex-wrap gap-2 border-t border-border pt-3"
          role="group"
          aria-label="Período do ranking"
        >
          {RECOVERY_RANKING_PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={option.value === period ? 'primary' : 'secondary'}
              aria-pressed={option.value === period}
              onClick={() => {
                setPeriod(option.value);
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      {rankingQuery.isLoading ? (
        <>
          <TableSkeleton rows={1} columns={3} />
          <TableSkeleton rows={5} columns={4} />
        </>
      ) : null}

      {rankingQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar o ranking"
          description="Não foi possível conectar ao servidor. Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!rankingQuery.isLoading && !rankingQuery.isError && rankingQuery.data ? (
        ranking.length > 0 ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                title="Receita recuperada"
                value={formatCurrencyFromDecimalString(
                  rankingQuery.data.totalRecoveredAmount,
                )}
                description={`${getRecoveryRankingPeriodLabel(period)} - ${formatInteger(
                  rankingQuery.data.totalRecoveredCases,
                )} casos`}
                variant="success"
                emphasis="primary"
              />
              <MetricCard
                title="Colaboradores no ranking"
                value={formatInteger(ranking.length)}
                description="Com ao menos uma recuperação no período"
              />
            </section>

            <RecoveryRankingPodium items={ranking} />

            <SectionCard
              title="Ranking completo"
              description="Todos os colaboradores com recuperações no período selecionado."
              contentClassName="p-0"
            >
              <TableContainer flush>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className="w-16">#</TableHeaderCell>
                      <TableHeaderCell>Colaborador</TableHeaderCell>
                      <TableHeaderCell align="right">
                        Casos recuperados
                      </TableHeaderCell>
                      <TableHeaderCell align="right">
                        Receita recuperada
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ranking.map((item) => (
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
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell numeric>
                          {formatInteger(item.recoveredCases)}
                        </TableCell>
                        <TableCell numeric className="font-semibold">
                          {formatCurrencyFromDecimalString(
                            item.recoveredAmount,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </>
        ) : (
          <EmptyState
            title="Nenhuma recuperação no período"
            description="Ainda não há cancelamentos revertidos no período selecionado. Assim que um caso for revertido para recuperado, ele aparece aqui."
          />
        )
      ) : null}
    </PageContainer>
  );
}
