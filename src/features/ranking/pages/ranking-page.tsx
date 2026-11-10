import { useState } from 'react';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { cn } from '@/lib/utils';
import { RecoveryAuditDrawer } from '@/features/ranking/components/recovery-audit-drawer';
import { RecoveryRankingKpis } from '@/features/ranking/components/recovery-ranking-kpis';
import { RecoveryRankingPodium } from '@/features/ranking/components/recovery-ranking-podium';
import { RecoveryRankingTable } from '@/features/ranking/components/recovery-ranking-table';
import { useRecoveryRanking } from '@/features/ranking/hooks/use-recovery-ranking';
import { type RecoveryRankingPeriod } from '@/features/ranking/types/ranking-api.types';
import { RECOVERY_RANKING_PERIOD_OPTIONS } from '@/features/ranking/utils/ranking-labels';
import { buildRankingRows } from '@/features/ranking/utils/ranking-stats';

export default function RankingPage() {
  const [period, setPeriod] = useState<RecoveryRankingPeriod>('current_month');
  const [auditAgent, setAuditAgent] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const rankingQuery = useRecoveryRanking(period);
  // O mês anterior só serve de referência para o mês atual.
  const previousQuery = useRecoveryRanking('last_month', {
    enabled: period === 'current_month',
  });

  const handleRetry = () => {
    void rankingQuery.refetch();
  };

  const data = rankingQuery.data;
  const rows = buildRankingRows(data?.ranking ?? []);

  return (
    <PageContainer>
      <PageHeader
        title="Ranking de recuperação"
        description="Receita paga por clientes que o atendente contatou antes do pagamento."
      >
        <div
          className="inline-flex flex-wrap rounded-lg border border-border bg-card p-0.5"
          role="group"
          aria-label="Período do ranking"
        >
          {RECOVERY_RANKING_PERIOD_OPTIONS.map((option) => {
            const active = option.value === period;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setPeriod(option.value);
                }}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/15 text-foreground'
                    : 'text-neutral hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </PageHeader>

      {rankingQuery.isLoading ? (
        <>
          <TableSkeleton rows={1} columns={4} />
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

      {!rankingQuery.isLoading && !rankingQuery.isError && data ? (
        rows.length > 0 ? (
          // A chave refaz a entrada (animação) ao trocar de período.
          <div key={period} className="space-y-6">
            <RecoveryRankingKpis
              totalAmount={data.totalRecoveredAmount}
              totalCases={data.totalRecoveredCases}
              collaborators={rows.length}
              previousAmount={
                period === 'current_month'
                  ? previousQuery.data?.totalRecoveredAmount
                  : undefined
              }
            />
            <RecoveryRankingPodium items={rows} />
            <RecoveryRankingTable rows={rows} onOpenAudit={setAuditAgent} />
          </div>
        ) : (
          <EmptyState
            title="Nenhuma recuperação no período"
            description="Ainda não há pagamentos de clientes contatados no período selecionado. Assim que um caso for recuperado, ele aparece aqui."
          />
        )
      ) : null}
      <RecoveryAuditDrawer
        agent={auditAgent}
        period={period}
        onClose={() => {
          setAuditAgent(null);
        }}
      />
    </PageContainer>
  );
}
