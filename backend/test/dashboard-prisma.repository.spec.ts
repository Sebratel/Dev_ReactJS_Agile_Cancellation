import { DashboardPrismaRepository } from '@/modules/dashboard/repositories/dashboard-prisma.repository';
import type { PrismaService } from '@/database/prisma/prisma.service';

describe('DashboardPrismaRepository operations', () => {
  it('consulta metricas operacionais no banco', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5);

    const aggregate = jest
      .fn()
      .mockResolvedValueOnce({
        _sum: { outstandingAmount: { toFixed: () => '1000.00' } },
      })
      .mockResolvedValueOnce({
        _sum: { promisedAmount: { toFixed: () => '200.00' } },
      })
      .mockResolvedValueOnce({
        _sum: { promisedAmount: { toFixed: () => '300.00' } },
      })
      .mockResolvedValueOnce({
        _sum: { outstandingAmount: { toFixed: () => '150.00' } },
      });

    const groupBy = jest
      .fn()
      .mockResolvedValue([{ name: 'LOWER_TITLES', _count: { _all: 4 } }]);

    const findMany = jest.fn().mockResolvedValue([
      {
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        completedAt: new Date('2026-06-06T00:00:00.000Z'),
      },
    ]);

    // 7 dos 10 ativos contatados no ciclo => 3 sem contato manual.
    const queryRaw = jest
      .fn()
      .mockResolvedValue([{ assignedUserId: 'usr_1', total: BigInt(7) }]);

    const prisma = {
      $queryRaw: queryRaw,
      collectionCase: { count, aggregate },
      paymentPromise: { count, aggregate },
      cancellationProcess: { count, findMany },
      cancellationStep: { groupBy },
    } as unknown as PrismaService;

    const repository = new DashboardPrismaRepository(prisma);
    const operations = await repository.getOperations();

    expect(operations.collection.activeCases).toBe(10);
    expect(operations.collection.newCasesToday).toBe(2);
    expect(operations.collection.casesWithoutInteraction).toBe(3);
    expect(operations.collection.slaConfigured).toBe(true);
    expect(operations.collection.overdueSlaCases).toBe(1);
    expect(operations.promises.activePromises).toBe(4);
    expect(operations.promises.fulfilledPromises).toBe(8);
    expect(operations.promises.brokenPromises).toBe(2);
    expect(operations.promises.fulfillmentRate).toBeCloseTo(8 / 10);
    expect(operations.cancellations.inProgress).toBe(3);
    expect(operations.cancellations.completed).toBe(5);
    expect(operations.cancellations.averageCompletionDays).toBe(5);
    expect(operations.cancellations.mostBlockedStep).toEqual({
      stepCode: 'LOWER_TITLES',
      count: 4,
    });
    expect(operations.financial.outstandingAmount).toBe('1000.00');
    expect(operations.financial.promisedAmount).toBe('200.00');
    expect(operations.financial.recoveredAmount).toBe('300.00');
    expect(operations.financial.cancelledAmount).toBe('150.00');
  });

  it('ranking soma o valor pago (recoveredAmount), nao o saldo em aberto zerado', async () => {
    const groupBy = jest.fn().mockResolvedValue([
      {
        assignedUserId: 'usr_deb',
        _sum: { recoveredAmount: { toString: () => '299.70' } },
        _count: { _all: 2 },
      },
      {
        assignedUserId: 'usr_ste',
        // Recuperado sem valor gravado (ex.: reativação manual) conta como zero.
        _sum: { recoveredAmount: null },
        _count: { _all: 1 },
      },
    ]);
    const findMany = jest.fn().mockResolvedValue([
      { id: 'usr_deb', name: 'Debora' },
      { id: 'usr_ste', name: 'Stephany' },
    ]);
    const prisma = {
      collectionCase: { groupBy },
      user: { findMany },
    } as unknown as PrismaService;

    const repository = new DashboardPrismaRepository(prisma);
    const result = await repository.getRecoveryRanking({
      from: new Date('2026-11-01T00:00:00.000Z'),
      to: new Date('2026-12-01T00:00:00.000Z'),
    });

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ _sum: { recoveredAmount: true } }),
    );
    expect(result.ranking[0]).toMatchObject({
      name: 'Debora',
      recoveredAmount: '299.70',
      recoveredCases: 2,
    });
    expect(result.ranking[1]).toMatchObject({
      name: 'Stephany',
      recoveredAmount: '0.00',
    });
    expect(result.totalRecoveredAmount).toBe('299.70');
    expect(result.totalRecoveredCases).toBe(3);
  });
});
