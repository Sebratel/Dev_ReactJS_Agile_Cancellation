import {
  buildCollectionCasesWhere,
  filterMockCollectionCases,
  matchesOverdueDateFilters,
  type MockCollectionCaseListRecord,
} from '@/modules/collection-cases/utils/collection-cases-list.utils';

function createRecord(
  overrides: Partial<MockCollectionCaseListRecord> = {},
): MockCollectionCaseListRecord {
  return {
    id: 'case_test',
    customerName: 'Cliente Teste',
    customerPhone: '(51) 99999-0000',
    contractCode: 'CTR-1',
    contractStatus: 'ACTIVE',
    firstOverdueDate: null,
    secondOverdueDate: null,
    status: 'IN_COLLECTION',
    priority: 'HIGH',
    daysOverdue: 30,
    outstandingAmount: '1000.00',
    assignedTo: { id: 'usr_1', name: 'Operador' },
    slaDueAt: null,
    matrixAwaitingReply: false,
    matrixLastOutboundAt: null,
    matrixLastReplyAt: null,
    assignedUserId: 'usr_1',
    customerDocument: '00.000.000/0001-00',
    contractExternalId: 'EXT-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasCollectionAttempts: true,
    totalAttempts: 1,
    paymentPromiseStatuses: ['ACTIVE'],
    ...overrides,
  };
}

describe('collection-cases list filters', () => {
  const now = new Date('2026-06-10T12:00:00.000Z');

  it('filtra casos criados hoje no Prisma where', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, createdToday: true },
      now,
    );

    const createdAtFilter = where.createdAt as {
      gte: Date;
      lt: Date;
    };

    expect(createdAtFilter.gte).toBeInstanceOf(Date);
    expect(createdAtFilter.lt).toBeInstanceOf(Date);
    expect(createdAtFilter.lt.getTime() - createdAtFilter.gte.getTime()).toBe(
      86_400_000,
    );
  });

  it('filtra casos sem interacao no Prisma where', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, interactionStatus: 'none' },
      now,
    );

    expect(where.collectionAttempts).toEqual({ none: {} });
  });

  it('filtra casos com promessa ativa no Prisma where', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, promiseStatus: 'ACTIVE' },
      now,
    );

    expect(where.paymentPromises).toEqual({
      some: { status: 'ACTIVE' },
    });
  });

  it('filtra casos criados hoje no mock', () => {
    const records = [
      createRecord({
        id: 'case_today',
        createdAt: new Date('2026-06-10T08:00:00.000Z').toISOString(),
      }),
      createRecord({
        id: 'case_old',
        createdAt: new Date('2026-06-09T08:00:00.000Z').toISOString(),
      }),
    ];

    const filtered = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, createdToday: true },
      now,
    );

    expect(filtered.map((record) => record.id)).toEqual(['case_today']);
  });

  it('filtra casos sem interacao no mock', () => {
    const records = [
      createRecord({ id: 'case_with', hasCollectionAttempts: true }),
      createRecord({ id: 'case_without', hasCollectionAttempts: false }),
    ];

    const filtered = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, interactionStatus: 'none' },
      now,
    );

    expect(filtered.map((record) => record.id)).toEqual(['case_without']);
  });

  it('filtra casos com promessa quebrada no mock', () => {
    const records = [
      createRecord({
        id: 'case_broken',
        paymentPromiseStatuses: ['BROKEN'],
      }),
      createRecord({
        id: 'case_active',
        paymentPromiseStatuses: ['ACTIVE'],
      }),
    ];

    const filtered = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, promiseStatus: 'BROKEN' },
      now,
    );

    expect(filtered.map((record) => record.id)).toEqual(['case_broken']);
  });

  // Regressao: as datas de vencimento sao gravadas como meia-noite UTC (dia
  // "puro"). O supervisor digita o dia que ve na tela (ex.: seed-invoice-004
  // com dueDate 2025-10-20T00:00:00.000Z), e o filtro precisa comparar o dia
  // calendario em UTC, nao no fuso local do processo — senao, em fusos atras
  // de UTC (ex.: America/Sao_Paulo), o dia exibido na tela ja e um dia antes
  // do que o backend estava comparando, e nenhum resultado batia.
  it('encontra no mock o caso cujo vencimento exato bate com o filtro (dia UTC)', () => {
    const records = [
      createRecord({
        id: 'case_seed_004',
        firstOverdueDate: '2025-10-20T00:00:00.000Z',
      }),
    ];

    const matches = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, firstDueDate: '2025-10-20' },
      now,
    );
    expect(matches.map((record) => record.id)).toEqual(['case_seed_004']);

    // O dia anterior (o que apareceria na tela em fusos atras de UTC antes
    // da correcao) nao deve casar.
    const wrongDay = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, firstDueDate: '2025-10-19' },
      now,
    );
    expect(wrongDay).toHaveLength(0);
  });

  // Regressao: buildCollectionCasesWhere NAO deve mais expressar o filtro de
  // vencimento como "existe alguma fatura em aberto nesse dia" — um contrato
  // pode acumular uma 3a fatura vencida (ver erp-sync.service.ts) sem que
  // isso o torne "achavel" por uma data que nao e a 1a/2a exibida na tela.
  // Esse filtro agora e resolvido pelo repositorio Prisma via rank, usando
  // matchesOverdueDateFilters — nao pelo where builder.
  it('nao inclui condicao de vencimento no Prisma where (resolvido a parte, por rank)', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, firstDueDate: '2025-10-20' },
      now,
    );

    expect(where.contract).toBeUndefined();
  });

  describe('matchesOverdueDateFilters', () => {
    it('bate quando a 1a e 2a fatura mais antigas correspondem aos filtros', () => {
      const invoices = [
        { dueDate: new Date('2026-06-01T00:00:00.000Z') },
        { dueDate: new Date('2026-07-01T00:00:00.000Z') },
      ];

      expect(
        matchesOverdueDateFilters(invoices, {
          firstDueDate: '2026-06-01',
          secondDueDate: '2026-07-01',
        }),
      ).toBe(true);
    });

    it('nao bate quando a data buscada e de uma 3a fatura, nao a 1a/2a mais antiga', () => {
      // O contrato tem uma fatura vencendo em 2026-07-05, mas ela e a 3a
      // mais antiga (nao entra no take:2) — nao deve casar com o filtro.
      const oldestTwo = [
        { dueDate: new Date('2026-05-01T00:00:00.000Z') },
        { dueDate: new Date('2026-06-01T00:00:00.000Z') },
      ];

      expect(
        matchesOverdueDateFilters(oldestTwo, { firstDueDate: '2026-07-05' }),
      ).toBe(false);
      expect(
        matchesOverdueDateFilters(oldestTwo, { secondDueDate: '2026-07-05' }),
      ).toBe(false);
    });

    it('sem filtros de vencimento, sempre bate', () => {
      expect(matchesOverdueDateFilters([], {})).toBe(true);
    });
  });
});
