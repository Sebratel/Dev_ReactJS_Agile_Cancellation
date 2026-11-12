/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) e mocks tipados como any */
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
    customerPhone2: null,
    contractCode: 'CTR-1',
    contractStatus: 'ACTIVE',
    contractErpStatus: 'Normal',
    contractCancellationReason: null,
    contractCancellationReasonCategory: null,
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
    origin: null,
    assignedUserId: 'usr_1',
    assignedAt: new Date().toISOString(),
    customerDocument: '00.000.000/0001-00',
    contractExternalId: 'EXT-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasCollectionAttempts: true,
    totalAttempts: 1,
    lastContactAt: null,
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

  it('filtra "nao contatados" (sem tentativa manual) no Prisma where', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, interactionStatus: 'not_contacted' },
      now,
    );

    expect(where.AND).toEqual([
      { OR: [{ collectionAttempts: { none: { isAutomatic: false } } }] },
    ]);
  });

  it('filtra "ja contatados" (com tentativa manual) no Prisma where', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, interactionStatus: 'contacted' },
      now,
    );

    expect(where.collectionAttempts).toEqual({
      some: { isAutomatic: false },
    });
  });

  it('mantem o legado "none" como "nao contatados"', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, interactionStatus: 'none' },
      now,
    );

    expect(where.AND).toEqual([
      { OR: [{ collectionAttempts: { none: { isAutomatic: false } } }] },
    ]);
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

  it('filtra "nao contatados" (so tentativa automatica) no mock', () => {
    const records = [
      createRecord({ id: 'case_manual', totalAttempts: 3 }),
      createRecord({ id: 'case_auto', totalAttempts: 1 }),
    ];

    const filtered = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, interactionStatus: 'not_contacted' },
      now,
    );

    expect(filtered.map((record) => record.id)).toEqual(['case_auto']);
  });

  it('filtra "ja contatados" (com tentativa manual) no mock', () => {
    const records = [
      createRecord({ id: 'case_manual', totalAttempts: 3 }),
      createRecord({ id: 'case_auto', totalAttempts: 1 }),
    ];

    const filtered = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, interactionStatus: 'contacted' },
      now,
    );

    expect(filtered.map((record) => record.id)).toEqual(['case_manual']);
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

describe('lista de casos — so carteira ativa por padrao (A4)', () => {
  it('sem status explicito o where exclui finalizados e AWAITING_PAYMENT', () => {
    const where = buildCollectionCasesWhere({ page: 1, limit: 10 });

    expect(where.status).toEqual({
      in: [
        'WAITING_TRIAGE',
        'IN_COLLECTION',
        'NO_RESPONSE',
        'ELIGIBLE_FOR_CANCELLATION',
        'CANCELLATION_IN_PROGRESS',
        'CANCELLED_IN_RECOVERY',
      ],
    });
  });

  it('status finalizado escolhido explicitamente continua listando', () => {
    const where = buildCollectionCasesWhere({
      page: 1,
      limit: 10,
      status: 'CLOSED',
    });

    expect(where.status).toBe('CLOSED');
  });

  it('SLA vencido sem status nao reabre os finalizados', () => {
    const where = buildCollectionCasesWhere({
      page: 1,
      limit: 10,
      slaStatus: 'overdue',
    });

    expect(where.status).toEqual({
      in: expect.arrayContaining(['IN_COLLECTION']),
    });
  });

  it('mock: lista sem status exclui finalizados; com status=CLOSED inclui', () => {
    const records = [
      createRecord({ id: 'ativo', status: 'IN_COLLECTION' }),
      createRecord({ id: 'fechado', status: 'CLOSED' }),
      createRecord({ id: 'pago', status: 'PAYMENT_MADE' }),
    ];

    expect(
      filterMockCollectionCases(records, { page: 1, limit: 10 }).map(
        (record) => record.id,
      ),
    ).toEqual(['ativo']);
    expect(
      filterMockCollectionCases(records, {
        page: 1,
        limit: 10,
        status: 'CLOSED',
      }).map((record) => record.id),
    ).toEqual(['fechado']);
  });
});

describe('lista de casos — busca e definicao unica de contatado (rodada 2)', () => {
  const now = new Date('2026-06-10T12:00:00.000Z');

  it('busca por texto sem status NAO restringe a ativos (acha finalizados)', () => {
    const where = buildCollectionCasesWhere({
      page: 1,
      limit: 10,
      search: 'Cliente',
    });

    expect(where.status).toBeUndefined();
    expect(where.OR).toBeDefined();
  });

  it('sem busca e sem status continua so ativos', () => {
    expect(buildCollectionCasesWhere({ page: 1, limit: 10 }).status).toEqual({
      in: expect.arrayContaining(['IN_COLLECTION']),
    });
  });

  it('mock: busca sem status inclui CLOSED; sem busca exclui', () => {
    const records = [
      createRecord({ id: 'ativo', status: 'IN_COLLECTION' }),
      createRecord({ id: 'fechado', status: 'CLOSED' }),
    ];

    expect(
      filterMockCollectionCases(records, {
        page: 1,
        limit: 10,
        search: 'cliente teste',
      }).map((record) => record.id),
    ).toEqual(['ativo', 'fechado']);
    expect(
      filterMockCollectionCases(records, { page: 1, limit: 10 }).map(
        (record) => record.id,
      ),
    ).toEqual(['ativo']);
  });

  it('caso reaberto (contato so de ciclo anterior) conta como NAO contatado', () => {
    const stale = ['case_reaberto'];

    const contacted = buildCollectionCasesWhere(
      { page: 1, limit: 10, interactionStatus: 'contacted' },
      now,
      { staleContactCaseIds: stale },
    );
    const notContacted = buildCollectionCasesWhere(
      { page: 1, limit: 10, interactionStatus: 'not_contacted' },
      now,
      { staleContactCaseIds: stale },
    );

    expect(contacted.collectionAttempts).toEqual({
      some: { isAutomatic: false },
    });
    expect(contacted.AND).toEqual([{ id: { notIn: stale } }]);
    expect(notContacted.AND).toEqual([
      {
        OR: [
          { collectionAttempts: { none: { isAutomatic: false } } },
          { id: { in: stale } },
        ],
      },
    ]);
  });

  it('busca + contatado preserva o OR da busca (nao sobrescreve)', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, search: 'ana', interactionStatus: 'not_contacted' },
      now,
      { staleContactCaseIds: ['x'] },
    );

    expect(where.OR).toHaveLength(4);
    expect(where.AND).toHaveLength(1);
  });
});
