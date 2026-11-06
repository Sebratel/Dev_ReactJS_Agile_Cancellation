/* eslint-disable @typescript-eslint/no-unsafe-member-access -- matchers do jest (expect.*) e mocks tipados como any */
import type { Prisma } from '@prisma/client';
import {
  countContactedInCycleByAgent,
  findStaleContactCaseIds,
  PORTFOLIO_ACTIVE_STATUSES,
} from '@/modules/collection-cases/utils/portfolio-cases.util';
import { CollectionCasesPrismaRepository } from '@/modules/collection-cases/repositories/collection-cases-prisma.repository';
import type { PrismaService } from '@/database/prisma/prisma.service';

describe('portfolio-cases.util', () => {
  it('AWAITING_PAYMENT e finalizados ficam fora da carteira ativa', () => {
    expect(PORTFOLIO_ACTIVE_STATUSES).toEqual([
      'WAITING_TRIAGE',
      'IN_COLLECTION',
      'NO_RESPONSE',
      'ELIGIBLE_FOR_CANCELLATION',
      'CANCELLATION_IN_PROGRESS',
      'CANCELLED_IN_RECOVERY',
    ]);
  });

  it('conta contato manual no ciclo atual apenas de casos ativos', async () => {
    const queryRaw = jest.fn().mockResolvedValue([
      { assignedUserId: 'usr_1', total: BigInt(7) },
      { assignedUserId: null, total: 2 },
    ]);

    const result = await countContactedInCycleByAgent({
      $queryRaw: queryRaw,
    });

    expect(result.get('usr_1')).toBe(7);
    expect(result.get(null)).toBe(2);

    const sql = queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sql.sql).toContain('cc.status IN (?,?,?,?,?,?)');
    expect(sql.sql).toContain('a.isAutomatic = 0');
    expect(sql.sql).toContain(
      'cc.cycleStartedAt IS NULL OR a.attemptedAt >= cc.cycleStartedAt',
    );
    expect(sql.values).toEqual(PORTFOLIO_ACTIVE_STATUSES);
  });

  it('filtra pelo atendente quando informado (dashboard do atendente)', async () => {
    const queryRaw = jest.fn().mockResolvedValue([]);

    await countContactedInCycleByAgent({ $queryRaw: queryRaw }, 'usr_9');

    const sql = queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sql.sql).toContain('cc.assignedUserId = ?');
    expect(sql.values).toContain('usr_9');
  });
});

describe('CollectionCasesPrismaRepository.getPortfolios (A2)', () => {
  it('totalAssigned = ativos e interacted vem do contato no ciclo', async () => {
    const groupBy = jest
      .fn()
      .mockResolvedValueOnce([
        {
          assignedUserId: 'usr_1',
          _count: { _all: 10 },
          _sum: { outstandingAmount: null },
        },
      ])
      .mockResolvedValue([]);
    const queryRaw = jest
      .fn()
      .mockResolvedValue([{ assignedUserId: 'usr_1', total: BigInt(4) }]);
    const prisma = {
      collectionCase: { groupBy },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'usr_1', name: 'Ana', avatarUrl: null }]),
      },
      $queryRaw: queryRaw,
    } as unknown as PrismaService;

    const { portfolios } = await new CollectionCasesPrismaRepository(
      prisma,
    ).getPortfolios();

    expect(portfolios[0]).toMatchObject({
      totalActive: 10,
      totalAssigned: 10,
      interacted: 4,
      // contatados + sem interacao = total ativo (definicao unica).
      noManualInteraction: 6,
    });
    // Nenhum groupBy conta casos de qualquer status (sem filtro de status).
    for (const [args] of groupBy.mock.calls) {
      expect(args.where?.status).toBeDefined();
    }
  });
});

describe('findStaleContactCaseIds (caso reaberto com contato antigo)', () => {
  it('seleciona casos com manual so de ciclo anterior', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'case_1' }]);

    const ids = await findStaleContactCaseIds({
      $queryRaw: queryRaw,
    });

    expect(ids).toEqual(['case_1']);
    const sql = queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sql.sql).toContain('cc.cycleStartedAt IS NOT NULL');
    expect(sql.sql).toContain('NOT EXISTS');
    expect(sql.sql).toContain('a.attemptedAt >= cc.cycleStartedAt');
  });
});
