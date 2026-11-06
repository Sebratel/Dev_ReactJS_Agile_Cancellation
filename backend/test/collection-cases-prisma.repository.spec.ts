/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- matchers do jest (expect.*) e mocks tipados como any */
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
        customer: { name: 'Cliente DB', phone: '51999999999' },
        contract: {
          code: 'CTR-DB-1',
          status: 'Bloqueio Financeiro',
          invoices: [{ dueDate: new Date('2026-07-10T00:00:00') }],
        },
        assignedUser: { id: 'usr_db_1', name: 'Operador DB' },
        _count: { collectionAttempts: 2 },
        collectionAttempts: [{ attemptedAt: new Date('2026-07-09T12:00:00Z') }],
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
        where: {
          status: {
            in: [
              'WAITING_TRIAGE',
              'IN_COLLECTION',
              'NO_RESPONSE',
              'ELIGIBLE_FOR_CANCELLATION',
              'CANCELLATION_IN_PROGRESS',
              'CANCELLED_IN_RECOVERY',
            ],
          },
        },
        orderBy: [{ daysOverdue: 'desc' }, { outstandingAmount: 'desc' }],
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: {
        status: {
          in: [
            'WAITING_TRIAGE',
            'IN_COLLECTION',
            'NO_RESPONSE',
            'ELIGIBLE_FOR_CANCELLATION',
            'CANCELLATION_IN_PROGRESS',
            'CANCELLED_IN_RECOVERY',
          ],
        },
      },
    });
    expect(result.pagination.total).toBe(1);
    expect(result.items[0]?.customerName).toBe('Cliente DB');
    expect(result.items[0]?.lastContactAt).toBe('2026-07-09T12:00:00.000Z');
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
      contractStatus: 'ACTIVE',
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
              contract: { AND: Array<{ status?: string }> };
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
        contract: { AND: Array<{ status?: string }> };
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
    expect(findManyArgs.where.contract.AND).toContainEqual({
      status: 'ACTIVE',
    });
    expect(findManyArgs.orderBy).toEqual([
      { createdAt: 'asc' },
      { daysOverdue: 'desc' },
      { outstandingAmount: 'desc' },
    ]);
  });

  it('filtra por vencimento pelo rank das 2 faturas em aberto mais antigas do contrato', async () => {
    // Regressao: o contrato "case_db_2" tem uma 3a fatura em aberto vencendo
    // no mesmo dia buscado como "1o vencimento" (2026-06-01), mas ela nao e
    // a mais antiga do contrato (2026-05-01 e). O caso NAO deve aparecer no
    // resultado so porque "existe alguma fatura" naquele dia — so quando o
    // dia buscado bate com a 1a/2a fatura mais antiga (as mesmas exibidas na
    // tela como 1o/2o vencimento).
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'case_db_1',
          contract: {
            invoices: [
              { dueDate: new Date('2026-06-01T00:00:00.000Z') },
              { dueDate: new Date('2026-07-01T00:00:00.000Z') },
            ],
          },
        },
        {
          id: 'case_db_2',
          contract: {
            invoices: [
              { dueDate: new Date('2026-05-01T00:00:00.000Z') },
              { dueDate: new Date('2026-06-01T00:00:00.000Z') },
              { dueDate: new Date('2026-07-05T00:00:00.000Z') },
            ].slice(0, 2), // Prisma so traria as 2 mais antigas (take: 2)
          },
        },
      ])
      .mockResolvedValueOnce([]);
    const count = jest.fn().mockResolvedValue(0);

    const prisma = {
      collectionCase: { findMany, count },
    } as unknown as PrismaService;

    const repository = new CollectionCasesPrismaRepository(prisma);

    await repository.listCases({
      page: 1,
      limit: 10,
      firstDueDate: '2026-06-01',
      secondDueDate: '2026-07-01',
    });

    expect(findMany).toHaveBeenCalledTimes(2);

    const secondCallArgs = findMany.mock.calls[1]?.[0] as {
      where: { id: { in: string[] } };
    };
    expect(secondCallArgs.where.id).toEqual({ in: ['case_db_1'] });
  });

  it('resume casos por data de vencimento, respeitando o rank das 2 faturas mais antigas', async () => {
    // case_db_1: 1o vencimento 2026-06-01, 2o vencimento 2026-07-01.
    // case_db_2: sua fatura mais antiga vence 2026-06-01 tambem (mesmo dia do
    // 1o vencimento de case_db_1), mas o 2o vencimento e diferente
    // (2026-08-01) — cada contagem deve refletir isso corretamente.
    const findMany = jest.fn().mockResolvedValue([
      {
        contract: {
          invoices: [
            { dueDate: new Date('2026-06-01T00:00:00.000Z') },
            { dueDate: new Date('2026-07-01T00:00:00.000Z') },
          ],
        },
      },
      {
        contract: {
          invoices: [
            { dueDate: new Date('2026-06-01T00:00:00.000Z') },
            { dueDate: new Date('2026-08-01T00:00:00.000Z') },
          ],
        },
      },
    ]);

    const prisma = {
      collectionCase: { findMany },
    } as unknown as PrismaService;

    const repository = new CollectionCasesPrismaRepository(prisma);

    const summary = await repository.getOverdueDateSummary({
      page: 1,
      limit: 10,
    });

    expect(summary.firstDueDates).toEqual([{ date: '2026-06-01', count: 2 }]);
    expect(summary.secondDueDates).toEqual([
      { date: '2026-07-01', count: 1 },
      { date: '2026-08-01', count: 1 },
    ]);

    // Chama o Prisma so uma vez (busca os candidatos), sem a query paginada.
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('listCaseIds retorna todos os ids sem paginacao, sem chamar count', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'case_db_1' }, { id: 'case_db_2' }]);
    const count = jest.fn();
    const prisma = {
      collectionCase: { findMany, count },
    } as unknown as PrismaService;

    const repository = new CollectionCasesPrismaRepository(prisma);
    const ids = await repository.listCaseIds({
      page: 1,
      limit: 10,
      contractStatus: 'ACTIVE',
    });

    expect(ids).toEqual(['case_db_1', 'case_db_2']);
    expect(count).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true } }),
    );
  });

  it('listCaseIds respeita o filtro de vencimento pelo rank das faturas', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'case_db_1',
          contract: {
            invoices: [{ dueDate: new Date('2026-08-04T00:00:00.000Z') }],
          },
        },
        {
          id: 'case_db_2',
          contract: {
            invoices: [{ dueDate: new Date('2026-08-05T00:00:00.000Z') }],
          },
        },
      ])
      .mockResolvedValueOnce([{ id: 'case_db_1' }]);
    const prisma = {
      collectionCase: { findMany },
    } as unknown as PrismaService;

    const repository = new CollectionCasesPrismaRepository(prisma);
    const ids = await repository.listCaseIds({
      page: 1,
      limit: 10,
      firstDueDate: '2026-08-04',
    });

    expect(ids).toEqual(['case_db_1']);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['case_db_1'] } }),
      }),
    );
  });
});
