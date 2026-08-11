import { CollectionCasesPrismaRepository } from '@/modules/collection-cases/repositories/collection-cases-prisma.repository';
import type { PrismaService } from '@/database/prisma/prisma.service';

describe('CollectionCasesPrismaRepository', () => {
  it('monta query com paginação e ordenação padrão', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'case_db_1',
        status: 'IN_COLLECTION',
        priority: 'HIGH',
        daysOverdue: 10,
        outstandingAmount: { toFixed: () => '100.00' },
        slaDueAt: null,
        customer: { name: 'Cliente DB' },
        contract: { code: 'CTR-DB-1' },
        assignedUser: { name: 'Operador DB' },
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);

    const prisma = {
      collectionCase: {
        findMany,
        count,
      },
    } as unknown as PrismaService;

    const repository = new CollectionCasesPrismaRepository(prisma);
    const result = await repository.listCases({ page: 1, limit: 10 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        where: {},
        orderBy: [{ daysOverdue: 'desc' }, { outstandingAmount: 'desc' }],
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: {} });
    expect(result.pagination.total).toBe(1);
    expect(result.items[0]?.customerName).toBe('Cliente DB');
  });

  it('monta where e orderBy com filtros', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);

    const prisma = {
      collectionCase: {
        findMany,
        count,
      },
    } as unknown as PrismaService;

    const repository = new CollectionCasesPrismaRepository(prisma);

    await repository.listCases({
      page: 1,
      limit: 10,
      status: 'IN_COLLECTION',
      priority: 'HIGH',
      search: 'joao',
      daysOverdueMin: 30,
      daysOverdueMax: 120,
      totalOutstandingMin: 1000,
      totalOutstandingMax: 20000,
      slaStatus: 'overdue',
      sortBy: 'createdAt',
      sortDirection: 'asc',
    });

    expect(findMany).toHaveBeenCalledTimes(1);

    const firstCall = findMany.mock.calls[0] as
      | [
          {
            where: {
              status: string;
              priority: string;
              daysOverdue: { gte: number; lte: number };
              outstandingAmount: { gte: number; lte: number };
            };
            orderBy: Array<Record<string, string>>;
          },
        ]
      | undefined;
    const findManyArgs = firstCall?.[0] as {
      where: {
        status: string;
        priority: string;
        daysOverdue: { gte: number; lte: number };
        outstandingAmount: { gte: number; lte: number };
      };
      orderBy: Array<Record<string, string>>;
    };

    expect(findManyArgs.where.status).toBe('IN_COLLECTION');
    expect(findManyArgs.where.priority).toBe('HIGH');
    expect(findManyArgs.where.daysOverdue).toEqual({ gte: 30, lte: 120 });
    expect(findManyArgs.where.outstandingAmount).toEqual({
      gte: 1000,
      lte: 20000,
    });
    expect(findManyArgs.orderBy).toEqual([
      { createdAt: 'asc' },
      { daysOverdue: 'desc' },
      { outstandingAmount: 'desc' },
    ]);
  });
});
