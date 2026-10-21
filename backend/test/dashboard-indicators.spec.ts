import type { PrismaService } from '@/database/prisma/prisma.service';
import { DashboardPrismaRepository } from '@/modules/dashboard/repositories/dashboard-prisma.repository';

// Fixtures que reproduzem os cenarios da Auditoria de Indicadores (DEM-002):
// carteira ativa x finalizados (CLOSED com valor/dias antigos), cliente com
// mais de um caso, contrato nao cancelado, caso sem motivo.
type Row = {
  id: string;
  status: string;
  outstandingAmount: number;
  daysOverdue: number;
  customerId: string;
  assignedUserId: string | null;
  slaDueAt: Date | null;
  erpStatus: string | null;
  cancellationReason: string | null;
};

const ACTIVE = 'WAITING_TRIAGE';

function row(overrides: Partial<Row> & Pick<Row, 'id'>): Row {
  return {
    status: ACTIVE,
    outstandingAmount: 0,
    daysOverdue: 0,
    customerId: overrides.id,
    assignedUserId: null,
    slaDueAt: null,
    erpStatus: 'Bloqueio Financeiro',
    cancellationReason: null,
    ...overrides,
  };
}

const rows: Row[] = [
  row({ id: 'a1', customerId: 'c1', outstandingAmount: 100, daysOverdue: 10 }),
  // mesmo cliente do a1: conta 1 so nos inadimplentes
  row({ id: 'a2', customerId: 'c1', outstandingAmount: 50.5, daysOverdue: 5 }),
  // sem debito/atraso
  row({ id: 'a3', customerId: 'c2' }),
  row({
    id: 'a4',
    customerId: 'c3',
    outstandingAmount: 200,
    daysOverdue: 3,
    assignedUserId: 'usr_1',
  }),
  // finalizados: valor e dias antigos NAO entram na carteira
  row({
    id: 'k1',
    status: 'CLOSED',
    customerId: 'c4',
    outstandingAmount: 1000,
    daysOverdue: 90,
    erpStatus: 'Cancelado',
    cancellationReason: 'Encerrado por Inadimplência',
  }),
  row({
    id: 'k2',
    status: 'CLOSED',
    customerId: 'c5',
    outstandingAmount: 500,
    daysOverdue: 40,
    erpStatus: 'Cancelado',
    cancellationReason: null,
  }),
  // CLOSED cujo contrato NAO esta cancelado no ERP: fora do relatorio
  row({
    id: 'k3',
    status: 'CLOSED',
    customerId: 'c6',
    erpStatus: 'Normal',
  }),
  row({ id: 'p1', status: 'PAYMENT_MADE', customerId: 'c7' }),
];

type Where = Record<string, unknown> | undefined;

function matches(item: Row, where: Where): boolean {
  if (!where) return true;

  for (const [key, cond] of Object.entries(where)) {
    if (key === 'status') {
      const status = cond as string | { in?: string[]; notIn?: string[] };
      if (typeof status === 'string') {
        if (item.status !== status) return false;
      } else if (status.in && !status.in.includes(item.status)) {
        return false;
      } else if (status.notIn?.includes(item.status)) {
        return false;
      }
    } else if (key === 'assignedUserId') {
      if (item.assignedUserId !== cond) return false;
    } else if (key === 'daysOverdue') {
      if (!(item.daysOverdue > ((cond as { gt: number }).gt ?? 0))) {
        return false;
      }
    } else if (key === 'slaDueAt') {
      const sla = cond as { not?: null; lt?: Date };
      if (sla.not === null && item.slaDueAt === null) return false;
      if (sla.lt && !(item.slaDueAt && item.slaDueAt < sla.lt)) return false;
    } else if (key === 'contract') {
      const contract = cond as { erpStatus?: string };
      if (item.erpStatus !== contract.erpStatus) return false;
    } else if (key === 'NOT') {
      if (
        matches(
          item,
          (cond as { contract: object }).contract
            ? { contract: (cond as { contract: object }).contract }
            : undefined,
        )
      ) {
        return false;
      }
    }
    // demais chaves (recoveredAt, updatedAt, createdAt...) nao afetam estes cenarios
  }

  return true;
}

function createPrisma(contactedByUser: Record<string, number> = {}) {
  const decimal = (value: number) => ({
    toFixed: () => value.toFixed(2),
    toString: () => value.toFixed(2),
  });
  const filter = (where: Where) => rows.filter((item) => matches(item, where));

  const collectionCase = {
    aggregate: jest.fn(({ where }: { where?: Where }) =>
      Promise.resolve({
        _sum: {
          outstandingAmount: decimal(
            filter(where).reduce(
              (sum, item) => sum + item.outstandingAmount,
              0,
            ),
          ),
        },
      }),
    ),
    count: jest.fn(({ where }: { where?: Where }) =>
      Promise.resolve(filter(where).length),
    ),
    groupBy: jest.fn(({ where }: { where?: Where }) => {
      const counts = new Map<string, number>();
      for (const item of filter(where)) {
        counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
      }
      return Promise.resolve(
        [...counts].map(([status, total]) => ({
          status,
          _count: { _all: total },
        })),
      );
    }),
    findMany: jest.fn(
      ({
        where,
        select,
      }: {
        where?: Where;
        select?: Record<string, unknown>;
      }) => {
        const found = filter(where);
        if (select && 'contract' in select) {
          return Promise.resolve(
            found.map((item) => ({
              contract: { cancellationReason: item.cancellationReason },
            })),
          );
        }
        const customers = [...new Set(found.map((item) => item.customerId))];
        return Promise.resolve(customers.map((customerId) => ({ customerId })));
      },
    ),
  };

  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue(
      Object.entries(contactedByUser).map(([assignedUserId, total]) => ({
        assignedUserId,
        total: BigInt(total),
      })),
    ),
    collectionCase,
    paymentPromise: {
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: {} }),
    },
    cancellationProcess: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    cancellationStep: { groupBy: jest.fn().mockResolvedValue([]) },
    user: { count: jest.fn().mockResolvedValue(0) },
    collectionAttempt: { groupBy: jest.fn().mockResolvedValue([]) },
    invoice: { aggregate: jest.fn().mockResolvedValue({ _sum: {} }) },
  };

  return prisma as unknown as PrismaService;
}

describe('indicadores do dashboard (gabarito da auditoria)', () => {
  it('I1: valor em aberto soma so a carteira ativa (nao CLOSED)', async () => {
    const summary = await new DashboardPrismaRepository(
      createPrisma(),
    ).getSummary();

    // 100 + 50,50 + 0 + 200 — os R$ 1.500 de CLOSED ficam de fora.
    expect(summary.metrics.openAmount).toBe('350.50');
  });

  it('I2: clientes inadimplentes = distintos com caso ativo e atraso', async () => {
    const summary = await new DashboardPrismaRepository(
      createPrisma(),
    ).getSummary();

    // c1 (2 casos, conta 1) + c3; c4/c5 so tem caso CLOSED com atraso antigo.
    expect(summary.metrics.delinquentCustomers).toBe(2);
  });

  it('I3: visao do atendente so com casos ativos dele', async () => {
    const summary = await new DashboardPrismaRepository(
      createPrisma({ usr_1: 1 }),
    ).getSummary({ assignedUserId: 'usr_1' });

    expect(summary.metrics.openAmount).toBe('200.00');
    expect(summary.metrics.delinquentCustomers).toBe(1);
    expect(summary.metrics.assignedActiveCases).toBe(1);
  });

  it('I4: "sem contato manual" = ativos - contatados no ciclo', async () => {
    const summary = await new DashboardPrismaRepository(
      createPrisma({ usr_1: 1 }),
    ).getSummary();

    const alert = summary.operationalAlerts.find(
      (item) => item.key === 'noContactAttempt',
    );
    expect(summary.metrics.assignedActiveCases).toBe(4);
    expect(summary.metrics.contactedCases).toBe(1);
    expect(alert?.count).toBe(3);
  });

  it('I7: SLA nao configurado aparece como aviso, nao como 0 vencidos', async () => {
    const summary = await new DashboardPrismaRepository(
      createPrisma(),
    ).getSummary();

    const alert = summary.operationalAlerts.find(
      (item) => item.key === 'slaBreached',
    );
    expect(alert?.notice).toBe('SLA não configurado');
    expect(alert?.count).toBe(0);
  });

  it('I8: distribuicao separa carteira (ativos) de historico (finalizados)', async () => {
    const summary = await new DashboardPrismaRepository(
      createPrisma(),
    ).getSummary();

    const byStatus = Object.fromEntries(
      summary.statusDistribution.map((item) => [item.status, item]),
    );
    expect(byStatus.WAITING_TRIAGE).toMatchObject({
      count: 4,
      group: 'portfolio',
    });
    expect(byStatus.CLOSED).toMatchObject({ count: 3, group: 'history' });
    expect(byStatus.PAYMENT_MADE).toMatchObject({ count: 1, group: 'history' });
  });

  it('operacoes: valor em aberto ativo e sem contato manual no ciclo', async () => {
    const operations = await new DashboardPrismaRepository(
      createPrisma({ usr_1: 1 }),
    ).getOperations();

    expect(operations.financial.outstandingAmount).toBe('350.50');
    expect(operations.collection.activeCases).toBe(4);
    expect(operations.collection.casesWithoutInteraction).toBe(3);
    expect(operations.collection.slaConfigured).toBe(false);
    expect(operations.collection.overdueSlaCases).toBe(0);
  });

  it('I6: motivo — so CLOSED cancelado no ERP; sem motivo continua no total', async () => {
    const report = await new DashboardPrismaRepository(
      createPrisma(),
    ).getCancellationReasons();

    expect(report.totalClosed).toBe(2);
    expect(report.withReason).toBe(1);
    expect(report.excludedNotCancelled).toBe(1);
    expect(report.topReasons.map((item) => item.reason)).toContain(
      'Sem motivo registrado',
    );
    expect(report.byCategory.reduce((sum, item) => sum + item.count, 0)).toBe(
      2,
    );
    expect(
      report.byCategory.find((item) => item.category === 'INADIMPLENCIA')
        ?.percentage,
    ).toBe(50);
  });
});
