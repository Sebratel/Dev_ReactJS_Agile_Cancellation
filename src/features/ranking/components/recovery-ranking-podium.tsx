import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type RecoveryRankingItem } from '@/features/ranking/types/ranking-api.types';
import { getRankingInitials } from '@/features/ranking/utils/ranking-labels';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type RecoveryRankingPodiumProps = {
  items: RecoveryRankingItem[];
};

const PODIUM_STYLES: Record<
  number,
  { ring: string; badge: string; label: string }
> = {
  1: {
    ring: 'ring-2 ring-primary',
    badge: 'bg-primary text-foreground',
    label: '1o lugar',
  },
  2: {
    ring: 'ring-1 ring-border',
    badge: 'bg-muted text-foreground',
    label: '2o lugar',
  },
  3: {
    ring: 'ring-1 ring-border',
    badge: 'bg-muted text-foreground',
    label: '3o lugar',
  },
};

export function RecoveryRankingPodium({ items }: RecoveryRankingPodiumProps) {
  const topThree = items.slice(0, 3);

  if (topThree.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {topThree.map((item) => {
        const style = PODIUM_STYLES[item.rank] ?? PODIUM_STYLES[3];

        return (
          <div
            key={item.userId}
            className={cn(
              'flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-card',
              style?.ring,
            )}
          >
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-[0.1em]',
                style?.badge,
              )}
            >
              {item.rank === 1 ? (
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null}
              {style?.label}
            </span>

            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-bold text-foreground"
              aria-hidden="true"
            >
              {getRankingInitials(item.name)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-primary">
                {formatCurrencyFromDecimalString(item.recoveredAmount)}
              </p>
              <p className="mt-0.5 text-xs text-neutral">
                {formatInteger(item.recoveredCases)} casos recuperados
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
