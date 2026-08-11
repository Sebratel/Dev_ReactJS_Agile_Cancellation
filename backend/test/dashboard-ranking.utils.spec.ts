import { resolveRecoveryRankingRange } from '@/modules/dashboard/utils/dashboard-ranking.utils';

describe('resolveRecoveryRankingRange', () => {
  const now = new Date(2026, 6, 11); // 11 de julho de 2026

  it('resolve o mes atual', () => {
    const range = resolveRecoveryRankingRange('current_month', now);

    expect(range.from).toEqual(new Date(2026, 6, 1));
    expect(range.to).toEqual(new Date(2026, 7, 1));
  });

  it('resolve o mes anterior', () => {
    const range = resolveRecoveryRankingRange('last_month', now);

    expect(range.from).toEqual(new Date(2026, 5, 1));
    expect(range.to).toEqual(new Date(2026, 6, 1));
  });

  it('resolve os ultimos 3 meses', () => {
    const range = resolveRecoveryRankingRange('last_3_months', now);

    expect(range.from).toEqual(new Date(2026, 4, 1));
    expect(range.to).toEqual(new Date(2026, 7, 1));
  });

  it('resolve o acumulado total a partir da epoch', () => {
    const range = resolveRecoveryRankingRange('all', now);

    expect(range.from).toEqual(new Date(0));
    expect(range.to).toEqual(new Date(2026, 7, 1));
  });
});
