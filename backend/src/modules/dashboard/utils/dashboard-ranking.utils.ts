export const RECOVERY_RANKING_PERIODS = [
  'current_month',
  'last_month',
  'last_3_months',
  'all',
] as const;

export type RecoveryRankingPeriod = (typeof RECOVERY_RANKING_PERIODS)[number];

export type RecoveryRankingRange = {
  from: Date;
  to: Date;
};

// Converte o periodo selecionado em um intervalo [from, to) sobre recoveredAt.
export function resolveRecoveryRankingRange(
  period: RecoveryRankingPeriod,
  now: Date,
): RecoveryRankingRange {
  const year = now.getFullYear();
  const month = now.getMonth();
  const nextMonthStart = new Date(year, month + 1, 1);

  switch (period) {
    case 'last_month':
      return {
        from: new Date(year, month - 1, 1),
        to: new Date(year, month, 1),
      };
    case 'last_3_months':
      return {
        from: new Date(year, month - 2, 1),
        to: nextMonthStart,
      };
    case 'all':
      return {
        from: new Date(0),
        to: nextMonthStart,
      };
    case 'current_month':
    default:
      return {
        from: new Date(year, month, 1),
        to: nextMonthStart,
      };
  }
}
