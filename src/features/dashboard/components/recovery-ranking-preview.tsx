import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRecoveryRanking } from '@/features/ranking/hooks/use-recovery-ranking';
import { getRankingInitials } from '@/features/ranking/utils/ranking-labels';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

export function RecoveryRankingPreview() {
  const rankingQuery = useRecoveryRanking('current_month');
  const topThree = rankingQuery.data?.ranking.slice(0, 3) ?? [];

  return (
    <SectionCard
      title="Ranking de recuperação"
      description="Maiores valores salvos ao reverter cancelamentos neste mês."
      contentClassName="p-0"
    >
      {rankingQuery.isLoading ? (
        <p className="px-6 py-5 text-sm text-neutral">Carregando ranking...</p>
      ) : rankingQuery.isError ? (
        <p className="px-6 py-5 text-sm text-neutral">
          Não foi possível carregar o ranking agora.
        </p>
      ) : topThree.length === 0 ? (
        <p className="px-6 py-5 text-sm text-neutral">
          Nenhuma recuperação registrada neste mês ainda.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {topThree.map((item) => (
            <li key={item.userId} className="flex items-center gap-3 px-6 py-3">
              <span
                className={cn(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                  item.rank === 1
                    ? 'bg-primary text-foreground'
                    : 'bg-muted text-neutral',
                )}
              >
                {item.rank}
              </span>
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
                aria-hidden="true"
              >
                {getRankingInitials(item.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-neutral">
                  {formatInteger(item.recoveredCases)} casos
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-primary">
                {formatCurrencyFromDecimalString(item.recoveredAmount)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border px-6 py-3">
        <Link
          to="/ranking"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'sm' }),
            'inline-flex items-center gap-1.5',
          )}
        >
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Ver ranking completo
        </Link>
      </div>
    </SectionCard>
  );
}
