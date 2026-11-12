import { type RecoveryRankingItem } from '@/features/ranking/types/ranking-api.types';

export type RankingRow = RecoveryRankingItem & {
  /** Receita média por caso recuperado (0 quando não há casos). */
  averageTicket: number;
  /** Fatia da receita total do período, de 0 a 100. */
  sharePercent: number;
};

export function toNumber(value: string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildRankingRows(items: RecoveryRankingItem[]): RankingRow[] {
  const total = items.reduce(
    (sum, item) => sum + toNumber(item.recoveredAmount),
    0,
  );

  return items.map((item) => {
    const amount = toNumber(item.recoveredAmount);

    return {
      ...item,
      averageTicket: item.recoveredCases > 0 ? amount / item.recoveredCases : 0,
      sharePercent: total > 0 ? (amount / total) * 100 : 0,
    };
  });
}

export function getAverageTicket(totalAmount: string, totalCases: number) {
  return totalCases > 0 ? toNumber(totalAmount) / totalCases : 0;
}
