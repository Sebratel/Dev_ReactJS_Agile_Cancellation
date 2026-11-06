import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type RankingRow } from '@/features/ranking/utils/ranking-stats';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type RecoveryRankingPodiumProps = {
  items: RankingRow[];
};

type Slot = {
  position: 1 | 2 | 3;
  label: string;
  /** Ordem visual no desktop: 2º, 1º, 3º. Em telas pequenas segue 1º, 2º, 3º. */
  orderClass: string;
};

const SLOTS: Slot[] = [
  { position: 2, label: '2º lugar', orderClass: 'order-2 sm:order-1' },
  { position: 1, label: '1º lugar', orderClass: 'order-1 sm:order-2' },
  { position: 3, label: '3º lugar', orderClass: 'order-3' },
];

export function RecoveryRankingPodium({ items }: RecoveryRankingPodiumProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Pódio do ranking"
      className="grid gap-3 sm:grid-cols-3 sm:items-end"
    >
      {SLOTS.map((slot) => {
        const item = items[slot.position - 1];
        const isFirst = slot.position === 1;

        if (!item) {
          return (
            <div
              key={slot.position}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border p-6 text-center text-neutral',
                slot.orderClass,
              )}
            >
              <span className="text-xs font-bold uppercase tracking-[0.1em]">
                {slot.label}
              </span>
              <span className="text-sm">Vaga livre</span>
            </div>
          );
        }

        return (
          <div
            key={item.userId}
            className={cn(
              'flex flex-col items-center gap-3 rounded-2xl bg-card text-center shadow-card motion-safe:animate-rise-in-md',
              isFirst
                ? 'p-7 ring-2 ring-primary sm:pb-9'
                : 'p-5 ring-1 ring-border',
              slot.orderClass,
            )}
          >
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-[0.1em]',
                isFirst
                  ? 'bg-primary text-foreground'
                  : 'bg-muted text-foreground',
              )}
            >
              {isFirst ? (
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null}
              {slot.label}
            </span>

            <UserAvatar
              name={item.name}
              avatarUrl={item.avatarUrl}
              className={isFirst ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base'}
            />

            <div className="min-w-0 max-w-full">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p
                className={cn(
                  'mt-1 font-bold tabular-nums',
                  isFirst ? 'text-2xl text-primary' : 'text-lg text-foreground',
                )}
              >
                {formatCurrencyFromDecimalString(item.recoveredAmount)}
              </p>
              <p className="mt-0.5 text-xs text-neutral">
                {formatInteger(item.recoveredCases)}{' '}
                {item.recoveredCases === 1 ? 'caso' : 'casos'} ·{' '}
                {Math.round(item.sharePercent)}% do total
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
