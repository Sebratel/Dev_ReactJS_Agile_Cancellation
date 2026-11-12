import { describe, expect, it } from 'vitest';
import {
  buildRankingRows,
  getAverageTicket,
} from '@/features/ranking/utils/ranking-stats';

describe('ranking-stats', () => {
  it('calcula ticket medio e participacao por colaborador', () => {
    const rows = buildRankingRows([
      {
        rank: 1,
        userId: 'a',
        name: 'Stephany',
        recoveredAmount: '1009.03',
        recoveredCases: 5,
      },
      {
        rank: 2,
        userId: 'b',
        name: 'Debora',
        recoveredAmount: '459.60',
        recoveredCases: 3,
      },
    ]);

    expect(rows[0]?.averageTicket).toBeCloseTo(201.806, 3);
    expect(rows[0]?.sharePercent).toBeCloseTo(68.7, 1);
    expect(rows[1]?.sharePercent).toBeCloseTo(31.3, 1);
  });

  it('nao divide por zero sem receita ou sem casos', () => {
    const rows = buildRankingRows([
      {
        rank: 1,
        userId: 'a',
        name: 'Ana',
        recoveredAmount: '0.00',
        recoveredCases: 0,
      },
    ]);

    expect(rows[0]).toMatchObject({ averageTicket: 0, sharePercent: 0 });
    expect(getAverageTicket('0.00', 0)).toBe(0);
    expect(getAverageTicket('1468.63', 8)).toBeCloseTo(183.58, 2);
  });
});
