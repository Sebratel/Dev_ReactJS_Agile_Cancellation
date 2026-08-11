import { DashboardPrismaRepository } from '@/modules/dashboard/repositories/dashboard-prisma.repository';
import type { PrismaService } from '@/database/prisma/prisma.service';

describe('DashboardPrismaRepository operations', () => {
  it('consulta metricas operacionais no banco', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
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

    const prisma = {
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
});
