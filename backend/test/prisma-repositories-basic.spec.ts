/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) retornam any */
import { Prisma } from '@prisma/client';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { CaseNotesPrismaRepository } from '@/modules/case-notes/repositories/case-notes-prisma.repository';
import { CustomersPrismaRepository } from '@/modules/customers/repositories/customers-prisma.repository';
import { NotificationsPrismaRepository } from '@/modules/notifications/repositories/notifications-prisma.repository';
import { PaymentPromisesPrismaRepository } from '@/modules/payment-promises/repositories/payment-promises-prisma.repository';
import { UsersPrismaRepository } from '@/modules/users/repositories/users-prisma.repository';

const asPrisma = (value: unknown) => value as PrismaService;
const dec = (value: string) => new Prisma.Decimal(value);

describe('CustomersPrismaRepository', () => {
  const past = new Date('2020-01-01T00:00:00.000Z');
  const future = new Date('2099-01-01T00:00:00.000Z');

  function customer(id: string, name: string, invoices: unknown[]) {
    return {
      id,
      name,
      document: `doc-${id}`,
      email: null,
      phone: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      contracts: [
        {
          id: `ctr-${id}`,
          code: `CODE-${id}`,
          status: 'ACTIVE',
          totalValue: dec('500'),
          invoices,
        },
      ],
    };
  }

  const invoicesA = [
    {
      id: 'i1',
      invoiceNumber: '1',
      status: 'OPEN',
      dueDate: past,
      amount: dec('100'),
      paidAmount: dec('30'),
    },
    {
      id: 'i2',
      invoiceNumber: '2',
      status: 'OPEN',
      dueDate: future,
      amount: dec('50'),
      paidAmount: dec('0'),
    },
    {
      id: 'i3',
      invoiceNumber: '3',
      status: 'PAID',
      dueDate: past,
      amount: dec('10'),
      paidAmount: dec('10'),
    },
  ];

  it('lista ordenando por nome via banco, com busca textual', async () => {
    const findMany = jest.fn().mockReturnValue('find-op');
    const count = jest.fn().mockReturnValue('count-op');
    const transaction = jest
      .fn()
      .mockResolvedValue([[customer('a', 'Ana', invoicesA)], 1]);
    const repository = new CustomersPrismaRepository(
      asPrisma({ customer: { findMany, count }, $transaction: transaction }),
    );

    const result = await repository.listCustomers({
      page: 2,
      limit: 5,
      search: 'ana',
      sortDirection: 'desc',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        orderBy: { name: 'desc' },
        where: { OR: expect.any(Array) },
      }),
    );
    expect(result.pagination.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        contractsCount: 1,
        openInvoicesCount: 2,
        totalOutstanding: '120.00',
        overdueInvoicesCount: 1,
        overdueAmount: '70.00',
        notDueAmount: '50.00',
      }),
    );
  });

  describe('ordenacao em memoria', () => {
    const records = [
      customer('a', 'Ana', invoicesA),
      customer('b', 'Bia', [invoicesA[1]]),
      customer('c', 'Caio', []),
    ];
    const repository = () =>
      new CustomersPrismaRepository(
        asPrisma({
          customer: { findMany: jest.fn().mockResolvedValue(records) },
        }),
      );

    it.each([
      ['overdueAmount', 'desc', ['a', 'b', 'c']],
      ['totalOutstanding', 'asc', ['c', 'b', 'a']],
      ['openInvoicesCount', 'desc', ['a', 'b', 'c']],
      ['contractsCount', 'asc', ['a', 'b', 'c']],
    ] as const)('ordena por %s %s', async (sortBy, sortDirection, ids) => {
      const result = await repository().listCustomers({
        page: 1,
        limit: 10,
        sortBy,
        sortDirection,
      });
      expect(result.items.map((i) => i.id)).toEqual(ids);
    });

    it('pagina o resultado ordenado', async () => {
      const result = await repository().listCustomers({
        page: 2,
        limit: 2,
        sortBy: 'totalOutstanding',
        sortDirection: 'desc',
      });
      expect(result.items.map((i) => i.id)).toEqual(['c']);
      expect(result.pagination.total).toBe(3);
    });

    it('mantem a ordem para campo desconhecido', async () => {
      const result = await repository().listCustomers({
        page: 1,
        limit: 10,
        sortBy: 'outro' as never,
      });
      expect(result.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getCustomerById', () => {
    it('retorna null quando nao encontra', async () => {
      const repository = new CustomersPrismaRepository(
        asPrisma({
          customer: { findUnique: jest.fn().mockResolvedValue(null) },
        }),
      );
      await expect(repository.getCustomerById('x')).resolves.toBeNull();
    });

    it('monta detalhes, historico ordenado e totais', async () => {
      const record = customer('a', 'Ana', invoicesA);
      record.contracts.push({
        id: 'ctr-2',
        code: 'CODE-2',
        status: 'ACTIVE',
        totalValue: null as never,
        invoices: [],
      });
      const repository = new CustomersPrismaRepository(
        asPrisma({
          customer: { findUnique: jest.fn().mockResolvedValue(record) },
        }),
      );

      const details = await repository.getCustomerById('a');

      expect(details?.contracts).toEqual([
        { id: 'ctr-a', code: 'CODE-a', status: 'ACTIVE', totalValue: '500.00' },
        { id: 'ctr-2', code: 'CODE-2', status: 'ACTIVE', totalValue: null },
      ]);
      expect(details?.paymentHistory[0]?.id).toBe('i2');
      const overdueById = Object.fromEntries(
        (details?.paymentHistory ?? []).map((i) => [i.id, i.isOverdue]),
      );
      expect(overdueById).toEqual({ i1: true, i2: false, i3: false });
      expect(details?.totalOutstanding).toBe('120.00');
      expect(details?.overdueInvoicesCount).toBe(1);
    });
  });
});

describe('UsersPrismaRepository', () => {
  const now = new Date('2026-06-01T00:00:00.000Z');
  const dbUser = {
    id: 'u1',
    email: 'a@b.com',
    name: 'Ana',
    avatarUrl: undefined,
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    userRoles: [{ role: { code: 'ADMIN' } }, { role: { code: 'INEXISTENTE' } }],
  };

  it('lista com filtros e mapeia usuarios (ignora papeis desconhecidos)', async () => {
    const findMany = jest.fn().mockReturnValue('f');
    const count = jest.fn().mockReturnValue('c');
    const transaction = jest.fn().mockResolvedValue([[dbUser], 1]);
    const repository = new UsersPrismaRepository(
      asPrisma({ user: { findMany, count }, $transaction: transaction }),
    );

    const result = await repository.list({
      page: 3,
      limit: 10,
      status: 'ACTIVE',
      role: 'ADMIN',
      search: 'ana',
    } as never);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
        where: {
          status: 'ACTIVE',
          userRoles: { some: { role: { code: 'ADMIN' } } },
          OR: expect.any(Array),
        },
      }),
    );
    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ roles: ['ADMIN'], avatarUrl: null }),
    );
  });

  it('lista sem filtros', async () => {
    const findMany = jest.fn();
    const count = jest.fn();
    const repository = new UsersPrismaRepository(
      asPrisma({
        user: { findMany, count },
        $transaction: jest.fn().mockResolvedValue([[], 0]),
      }),
    );
    await repository.list({ page: 1, limit: 10 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('busca por id e por email (normalizando o email)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(dbUser)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(dbUser);
    const repository = new UsersPrismaRepository(
      asPrisma({ user: { findUnique } }),
    );

    expect((await repository.findById('u1'))?.id).toBe('u1');
    await expect(repository.findById('x')).resolves.toBeNull();
    await repository.findByEmail('  A@B.com ');
    expect(findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { email: 'a@b.com' } }),
    );
  });

  it('cria usuario resolvendo os papeis', async () => {
    const create = jest.fn().mockResolvedValue(dbUser);
    const repository = new UsersPrismaRepository(
      asPrisma({
        role: {
          findMany: jest.fn().mockResolvedValue([{ id: 'r1', code: 'ADMIN' }]),
        },
        user: { create },
      }),
    );

    await repository.create({
      email: ' A@B.com ',
      name: 'Ana',
      status: 'ACTIVE',
      roleCodes: ['ADMIN'],
    } as never);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'a@b.com',
          userRoles: { create: [{ roleId: 'r1' }] },
        }),
      }),
    );
  });

  it('rejeita papeis inexistentes na criacao', async () => {
    const repository = new UsersPrismaRepository(
      asPrisma({
        role: { findMany: jest.fn().mockResolvedValue([]) },
        user: { create: jest.fn() },
      }),
    );

    await expect(
      repository.create({
        email: 'a@b.com',
        name: 'Ana',
        status: 'ACTIVE',
        roleCodes: ['ADMIN'],
      } as never),
    ).rejects.toBeInstanceOf(AppException);
  });

  describe('update', () => {
    function build(existing: unknown, updated: unknown) {
      const tx = {
        user: {
          update: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue(updated),
        },
        userRole: {
          deleteMany: jest.fn().mockResolvedValue({}),
          createMany: jest.fn().mockResolvedValue({}),
        },
      };
      const prisma = {
        user: { findUnique: jest.fn().mockResolvedValue(existing) },
        role: {
          findMany: jest.fn().mockResolvedValue([{ id: 'r1', code: 'ADMIN' }]),
        },
        $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      };
      return { tx, repository: new UsersPrismaRepository(asPrisma(prisma)) };
    }

    it('retorna null quando o usuario nao existe', async () => {
      const { repository } = build(null, null);
      await expect(repository.update('x', { name: 'N' })).resolves.toBeNull();
    });

    it('atualiza campos e substitui papeis', async () => {
      const { tx, repository } = build(dbUser, dbUser);
      const result = await repository.update('u1', {
        name: 'Novo',
        roleCodes: ['ADMIN'],
      } as never);
      expect(result?.id).toBe('u1');
      expect(tx.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
      expect(tx.userRole.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'u1', roleId: 'r1' }],
      });
    });

    it('nao mexe nos papeis quando nao informados e trata retorno vazio', async () => {
      const { tx, repository } = build(dbUser, null);
      await expect(
        repository.update('u1', { status: 'INACTIVE' } as never),
      ).resolves.toBeNull();
      expect(tx.userRole.deleteMany).not.toHaveBeenCalled();
    });
  });

  it('conta administradores ativos', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const repository = new UsersPrismaRepository(asPrisma({ user: { count } }));
    await expect(repository.countActiveAdmins()).resolves.toBe(2);
  });
});

describe('NotificationsPrismaRepository', () => {
  const createdAt = new Date('2026-06-01T00:00:00.000Z');
  const row = {
    id: 'n1',
    type: 'INFO',
    title: 'T',
    body: 'B',
    entityType: null,
    entityId: null,
    readAt: null,
    createdAt,
  };

  it('cria notificacao e lista supervisores ativos', async () => {
    const create = jest.fn().mockResolvedValue(row);
    const findMany = jest.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    const repository = new NotificationsPrismaRepository(
      asPrisma({ notification: { create }, user: { findMany } }),
    );

    const created = await repository.create({
      userId: 'u1',
      type: 'INFO',
      title: 'T',
      body: 'B',
    });
    expect(created.createdAt).toBe(createdAt.toISOString());
    expect(created.readAt).toBeNull();
    await expect(repository.listSupervisorUserIds()).resolves.toEqual([
      's1',
      's2',
    ]);
  });

  it('lista filtrando apenas nao lidas quando solicitado', async () => {
    const findMany = jest.fn().mockResolvedValue([row]);
    const count = jest.fn().mockResolvedValue(1);
    const repository = new NotificationsPrismaRepository(
      asPrisma({ notification: { findMany, count } }),
    );

    const unread = await repository.list({
      userId: 'u1',
      unreadOnly: true,
      page: 2,
      limit: 5,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', readAt: null },
        skip: 5,
        take: 5,
      }),
    );
    expect(unread.items).toHaveLength(1);

    await repository.list({
      userId: 'u1',
      unreadOnly: false,
      page: 1,
      limit: 5,
    });
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('conta nao lidas e marca todas como lidas', async () => {
    const count = jest.fn().mockResolvedValue(4);
    const updateMany = jest.fn().mockResolvedValue({ count: 3 });
    const repository = new NotificationsPrismaRepository(
      asPrisma({ notification: { count, updateMany } }),
    );
    await expect(repository.countUnread('u1')).resolves.toBe(4);
    await expect(repository.markAllAsRead('u1')).resolves.toBe(3);
  });

  it('marca como lida preservando readAt existente', async () => {
    const readAt = new Date('2026-05-01T00:00:00.000Z');
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({ ...row, readAt });
    const update = jest
      .fn()
      .mockImplementation(({ data }: { data: { readAt: Date } }) =>
        Promise.resolve({ ...row, readAt: data.readAt }),
      );
    const repository = new NotificationsPrismaRepository(
      asPrisma({ notification: { findFirst, update } }),
    );

    await expect(repository.markAsRead('n1', 'u1')).resolves.toBeNull();
    expect((await repository.markAsRead('n1', 'u1'))?.readAt).not.toBeNull();
    expect((await repository.markAsRead('n1', 'u1'))?.readAt).toBe(
      readAt.toISOString(),
    );
  });
});

describe('CaseNotesPrismaRepository', () => {
  const createdAt = new Date('2026-06-01T00:00:00.000Z');
  const note = (author: { id: string; name: string } | null) => ({
    id: 'note1',
    collectionCaseId: 'c1',
    content: 'texto',
    createdAt,
    author,
  });

  it('retorna o responsavel do caso ou undefined se nao existe', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ assignedUserId: 'u1' })
      .mockResolvedValueOnce({ assignedUserId: null })
      .mockResolvedValueOnce(null);
    const repository = new CaseNotesPrismaRepository(
      asPrisma({ collectionCase: { findUnique } }),
    );
    await expect(repository.getCaseAssigneeId('c1')).resolves.toBe('u1');
    await expect(repository.getCaseAssigneeId('c1')).resolves.toBeNull();
    await expect(repository.getCaseAssigneeId('c1')).resolves.toBeUndefined();
  });

  it('lista notas do caso e trata caso inexistente', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'c1' });
    const findMany = jest
      .fn()
      .mockResolvedValue([note({ id: 'u1', name: 'Ana' }), note(null)]);
    const repository = new CaseNotesPrismaRepository(
      asPrisma({ collectionCase: { findUnique }, caseNote: { findMany } }),
    );

    await expect(repository.listByCase('c1')).resolves.toBeNull();
    const notes = await repository.listByCase('c1');
    expect(notes).toHaveLength(2);
    expect(notes?.[0]?.author).toEqual({ id: 'u1', name: 'Ana' });
    expect(notes?.[1]?.author).toBeNull();
    expect(notes?.[0]?.createdAt).toBe(createdAt.toISOString());
  });

  it('cria nota para caso existente e retorna null caso contrario', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'c1' })
      .mockResolvedValueOnce({ id: 'c1' });
    const create = jest
      .fn()
      .mockResolvedValueOnce(note({ id: 'u1', name: 'Ana' }))
      .mockResolvedValueOnce(note(null));
    const repository = new CaseNotesPrismaRepository(
      asPrisma({ collectionCase: { findUnique }, caseNote: { create } }),
    );
    const params = { caseId: 'c1', authorId: 'u1', content: 'texto' };

    await expect(repository.create(params)).resolves.toBeNull();
    expect((await repository.create(params))?.author?.name).toBe('Ana');
    expect((await repository.create(params))?.author).toBeNull();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          collectionCaseId: 'c1',
          authorId: 'u1',
          content: 'texto',
        },
      }),
    );
  });
});

describe('PaymentPromisesPrismaRepository', () => {
  const promise = (overrides: Record<string, unknown> = {}) => ({
    id: 'p1',
    collectionCaseId: 'c1',
    status: 'ACTIVE',
    promisedAmount: dec('100.5'),
    promisedDate: new Date('2020-01-01T00:00:00.000Z'),
    notes: null,
    fulfilledAt: null,
    brokenAt: null,
    cancelledAt: null,
    createdAt: new Date('2019-12-01T00:00:00.000Z'),
    collectionCase: {
      status: 'IN_COLLECTION',
      recoveredAt: null,
      customer: { id: 'cus1', name: 'Ana', document: '123' },
      contract: { id: 'ctr1', code: 'CTR', status: 'ACTIVE' },
      assignedUser: { id: 'u1', name: 'Op' },
    },
    ...overrides,
  });

  it('lista com todos os filtros e marca promessa ativa vencida', async () => {
    const findMany = jest.fn().mockResolvedValue([
      promise(),
      promise({
        id: 'p2',
        status: 'FULFILLED',
        fulfilledAt: new Date('2020-01-02T00:00:00.000Z'),
        collectionCase: {
          status: 'RECOVERED',
          recoveredAt: new Date('2020-01-03T00:00:00.000Z'),
          customer: { id: 'cus1', name: 'Ana', document: '123' },
          contract: { id: 'ctr1', code: 'CTR', status: 'ACTIVE' },
          assignedUser: null,
        },
      }),
    ]);
    const count = jest.fn().mockResolvedValue(2);
    const repository = new PaymentPromisesPrismaRepository(
      asPrisma({ paymentPromise: { findMany, count } }),
    );

    const result = await repository.list({
      status: 'ACTIVE',
      from: '2019-01-01',
      to: '2030-01-01',
      assignedUserId: 'u1',
      search: 'ana',
      page: 1,
      limit: 10,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          promisedDate: { gte: expect.any(Date), lte: expect.any(Date) },
          collectionCase: {
            assignedUserId: 'u1',
            OR: expect.any(Array),
          },
        }),
      }),
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        isOverdue: true,
        promisedAmount: '100.5',
        assignedTo: { id: 'u1', name: 'Op' },
      }),
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        isOverdue: false,
        assignedTo: null,
        fulfilledAt: '2020-01-02T00:00:00.000Z',
        caseStatus: 'RECOVERED',
        caseRecoveredAt: '2020-01-03T00:00:00.000Z',
      }),
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        caseStatus: 'IN_COLLECTION',
        caseRecoveredAt: null,
      }),
    );
  });

  it('filtra pela situacao do caso (quem ja pagou)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new PaymentPromisesPrismaRepository(
      asPrisma({
        paymentPromise: { findMany, count: jest.fn().mockResolvedValue(0) },
      }),
    );

    await repository.list({ page: 1, limit: 10, caseSituation: 'PAID' });
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          status: { not: 'CANCELLED' },
          collectionCase: { status: { in: ['RECOVERED', 'PAYMENT_MADE'] } },
        },
      }),
    );

    await repository.list({
      page: 1,
      limit: 10,
      caseSituation: 'CANCELLATION',
    });
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          status: { not: 'CANCELLED' },
          collectionCase: {
            status: {
              in: [
                'ELIGIBLE_FOR_CANCELLATION',
                'CANCELLATION_IN_PROGRESS',
                'CANCELLED_IN_RECOVERY',
              ],
            },
          },
        },
      }),
    );
  });

  it('lista sem filtros opcionais', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new PaymentPromisesPrismaRepository(
      asPrisma({
        paymentPromise: { findMany, count: jest.fn().mockResolvedValue(0) },
      }),
    );
    await repository.list({ page: 1, limit: 10 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { not: 'CANCELLED' }, collectionCase: {} },
      }),
    );
  });

  it('so lista canceladas quando o filtro de status pede', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new PaymentPromisesPrismaRepository(
      asPrisma({
        paymentPromise: { findMany, count: jest.fn().mockResolvedValue(0) },
      }),
    );
    await repository.list({ page: 1, limit: 10, status: 'CANCELLED' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'CANCELLED', collectionCase: {} },
      }),
    );
  });

  it('calcula o resumo de promessas', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    const repository = new PaymentPromisesPrismaRepository(
      asPrisma({ paymentPromise: { count } }),
    );
    await expect(repository.getSummary()).resolves.toEqual({
      active: 10,
      overdue: 3,
      overduePaid: 1,
      fulfilledThisMonth: 5,
      brokenThisMonth: 2,
    });
  });
});
