import {
  calculateAverageCompletionDays,
  calculateFulfillmentRate,
  resolveMostBlockedStep,
} from '@/modules/dashboard/utils/dashboard-operations.utils';

describe('dashboard-operations.utils', () => {
  describe('calculateFulfillmentRate', () => {
    it('calcula taxa de cumprimento corretamente', () => {
      expect(calculateFulfillmentRate(3, 1)).toBe(0.75);
      expect(calculateFulfillmentRate(58, 14)).toBeCloseTo(0.8056, 4);
    });

    it('retorna zero quando nao ha promessas finalizadas', () => {
      expect(calculateFulfillmentRate(0, 0)).toBe(0);
    });
  });

  describe('calculateAverageCompletionDays', () => {
    it('calcula media de dias entre createdAt e completedAt', () => {
      const average = calculateAverageCompletionDays([
        {
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          completedAt: new Date('2026-06-06T00:00:00.000Z'),
        },
        {
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          completedAt: new Date('2026-06-11T00:00:00.000Z'),
        },
      ]);

      expect(average).toBe(7.5);
    });

    it('retorna zero quando nao ha processos concluidos', () => {
      expect(calculateAverageCompletionDays([])).toBe(0);
    });

    it('ignora conclusoes com completedAt anterior ao createdAt', () => {
      expect(
        calculateAverageCompletionDays([
          {
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            completedAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ]),
      ).toBe(0);
    });
  });

  describe('resolveMostBlockedStep', () => {
    it('retorna etapa com mais pendencias', () => {
      expect(
        resolveMostBlockedStep([
          { name: 'OPEN_ELEVEN_REQUEST', _count: { _all: 9 } },
        ]),
      ).toEqual({
        stepCode: 'OPEN_ELEVEN_REQUEST',
        count: 9,
      });
    });

    it('retorna nulo quando nao ha etapas pendentes', () => {
      expect(resolveMostBlockedStep([])).toEqual({
        stepCode: null,
        count: 0,
      });
    });
  });
});
