import { Link } from 'react-router-dom';
import { SectionCard } from '@/components/data-display/section-card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { useRecoveryRanking } from '@/features/ranking/hooks/use-recovery-ranking';
import { formatCurrencyFromDecimalString } from '@/utils/formatters';

const SLOTS = [1, 2, 3] as const;

// Mini-ranking do mês: três posições; vagas sem ninguém aparecem como livres.
export function SupervisorTopRecoverersCard() {
  const rankingQuery = useRecoveryRanking('current_month');
  const ranking = rankingQuery.data?.ranking ?? [];

  return (
    <SectionCard
      title="Top recuperadores"
      description="Mês atual"
      contentClassName="p-4"
    >
      {rankingQuery.isError ? (
        <p className="py-6 text-center text-sm text-neutral">
          Não foi possível carregar o ranking agora.
        </p>
      ) : (
        <ol className="space-y-3">
          {SLOTS.map((position) => {
            const item = ranking[position - 1];

            return (
              <li key={position} className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-4 text-sm font-bold tabular-nums',
                    !item && 'text-neutral',
                  )}
                >
                  {position}
                </span>
                {item ? (
                  <>
                    <UserAvatar
                      name={item.name}
                      avatarUrl={item.avatarUrl}
                      className="h-7 w-7 text-[10px]"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {item.name}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrencyFromDecimalString(item.recoveredAmount)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs text-neutral">
                      —
                    </span>
                    <span className="flex-1 text-sm text-neutral">
                      {rankingQuery.isLoading ? 'Carregando…' : 'Vaga livre'}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4 text-xs">
        <Link
          to="/ranking"
          className="font-medium text-primary hover:underline"
        >
          Ver ranking completo →
        </Link>
      </div>
    </SectionCard>
  );
}
