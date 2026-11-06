import {
  buildCollectionCasesOrderBy,
  buildCollectionCasesWhere,
  filterMockCollectionCases,
  normalizeListParams,
  parseDateInput,
  sortMockCollectionCases,
  toListItemResponse,
  type MockCollectionCaseListRecord,
} from '@/modules/collection-cases/utils/collection-cases-list.utils';

function createRecord(
  overrides: Partial<MockCollectionCaseListRecord> = {},
): MockCollectionCaseListRecord {
  return {
    id: 'case_1',
    customerName: 'Maria Silva',
    customerPhone: '(51) 99999-0000',
    customerPhone2: null,
    contractCode: 'CTR-1',
    contractStatus: 'ACTIVE',
    contractErpStatus: null,
    contractCancellationReason: null,
    contractCancellationReasonCategory: null,
    firstOverdueDate: '2026-05-01T00:00:00.000Z',
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
    assignedAt: '2026-06-05T10:00:00.000Z',
    customerDocument: '123.456.789-00',
    contractExternalId: 'EXT-9',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-02T10:00:00.000Z',
    hasCollectionAttempts: true,
    totalAttempts: 1,
    lastContactAt: null,
    paymentPromiseStatuses: [],
    ...overrides,
  };
}

const base = { page: 1, limit: 10 };
const now = new Date('2026-06-10T12:00:00.000Z');

describe('collection-cases-list.utils', () => {
  describe('parseDateInput', () => {
    it('retorna undefined para vazio e para data invalida', () => {
      expect(parseDateInput(undefined)).toBeUndefined();
      expect(parseDateInput('')).toBeUndefined();
      expect(parseDateInput('nao-e-data')).toBeUndefined();
    });

    it('interpreta a data como meia-noite UTC', () => {
      expect(parseDateInput('2026-06-10')?.toISOString()).toBe(
        '2026-06-10T00:00:00.000Z',
      );
    });
  });

  describe('normalizeListParams', () => {
    it('aplica defaults e descarta busca em branco', () => {
      const result = normalizeListParams({ search: '  ' } as never);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.search).toBeUndefined();
    });

    it('corrige valores fora da faixa e apara a busca', () => {
      const result = normalizeListParams({
        page: -3,
        limit: 500,
        search: ' joao ',
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
      expect(result.search).toBe('joao');
      expect(normalizeListParams({ page: 2, limit: 0 }).limit).toBe(1);
    });
  });

  describe('buildCollectionCasesWhere', () => {
    it('combina filtros simples', () => {
      const where = buildCollectionCasesWhere(
        {
          ...base,
          status: 'CLOSED',
          priority: 'LOW',
          assignedToId: 'usr_7',
          hsmDeliveryState: 'DELIVERED',
          contractStatus: 'ACTIVE',
          promiseStatus: 'BROKEN',
          origin: 'PRE_COLLECTION',
        } as never,
        now,
      );
      expect(where.status).toBe('CLOSED');
      expect(where.priority).toBe('LOW');
      expect(where.assignedUserId).toBe('usr_7');
      expect(where.hsmDeliveryState).toBe('DELIVERED');
      expect(where.contract).toEqual({ AND: [{ status: 'ACTIVE' }] });
      expect(where.paymentPromises).toEqual({ some: { status: 'BROKEN' } });
      expect(where.origin).toBe('PRE_COLLECTION');
    });

    it('statusIn filtra por varios status e status unico tem prioridade', () => {
      const many = buildCollectionCasesWhere(
        { ...base, statusIn: ['CLOSED', 'CANCELLED_IN_RECOVERY'] },
        now,
      );
      expect(many.status).toEqual({
        in: ['CLOSED', 'CANCELLED_IN_RECOVERY'],
      });

      const single = buildCollectionCasesWhere(
        {
          ...base,
          status: 'CLOSED',
          statusIn: ['RECOVERED'],
        },
        now,
      );
      expect(single.status).toBe('CLOSED');
    });

    it('filtra pelo motivo do cancelamento (texto limpo do relatorio)', () => {
      const where = buildCollectionCasesWhere(
        {
          ...base,
          contractStatus: 'CANCELLED',
          cancellationReason: 'Inadimplência',
        },
        now,
      );
      expect(where.contract).toEqual({
        AND: [
          { status: 'CANCELLED' },
          {
            OR: [
              { cancellationReason: { equals: 'Inadimplência' } },
              { cancellationReason: { endsWith: ' - Inadimplência' } },
              { cancellationReason: { endsWith: ' – Inadimplência' } },
              { cancellationReason: { endsWith: ': Inadimplência' } },
            ],
          },
        ],
      });

      const none = buildCollectionCasesWhere(
        { ...base, cancellationReason: 'Sem motivo registrado' },
        now,
      );
      expect(none.contract).toEqual({
        AND: [{ cancellationReason: null }],
      });
    });

    it('a carteira ativa inclui cancelados em recuperacao', () => {
      const where = buildCollectionCasesWhere({ ...base }, now);
      const statuses = (where.status as { in: string[] }).in;
      expect(statuses).toContain('CANCELLED_IN_RECOVERY');
    });

    it('trata assignedToId=unassigned e origin=null', () => {
      const where = buildCollectionCasesWhere(
        { ...base, assignedToId: 'unassigned', origin: 'null' },
        now,
      );
      expect(where.assignedUserId).toBeNull();
      expect(where.origin).toBeNull();
    });

    it('monta OR de busca textual', () => {
      const where = buildCollectionCasesWhere({ ...base, search: 'ana' }, now);
      expect(where.OR).toHaveLength(4);
      expect(where.status).toBeUndefined();
    });

    it('monta faixas de dias em atraso e de valor (somente minimo ou maximo)', () => {
      expect(
        buildCollectionCasesWhere({ ...base, daysOverdueMin: 5 }, now)
          .daysOverdue,
      ).toEqual({ gte: 5 });
      expect(
        buildCollectionCasesWhere({ ...base, daysOverdueMax: 9 }, now)
          .daysOverdue,
      ).toEqual({ lte: 9 });
      expect(
        buildCollectionCasesWhere({ ...base, totalOutstandingMin: 10 }, now)
          .outstandingAmount,
      ).toEqual({ gte: 10 });
      expect(
        buildCollectionCasesWhere({ ...base, totalOutstandingMax: 99 }, now)
          .outstandingAmount,
      ).toEqual({ lte: 99 });
    });

    it.each([
      ['no_sla', null],
      ['overdue', { lt: now }],
      ['ok', { gt: now }],
    ] as const)('aplica filtro de SLA %s', (slaStatus, expected) => {
      const where = buildCollectionCasesWhere({ ...base, slaStatus }, now);
      expect(where.slaDueAt).toEqual(expected);
    });

    it('aplica filtro de SLA due_today com limites do dia', () => {
      const where = buildCollectionCasesWhere(
        { ...base, slaStatus: 'due_today' },
        now,
      );
      const sla = where.slaDueAt as { gte: Date; lte: Date };
      expect(sla.lte.getTime()).toBeGreaterThan(sla.gte.getTime());
    });

    it('ignora SLA desconhecido', () => {
      const where = buildCollectionCasesWhere(
        { ...base, slaStatus: 'xyz' as never },
        now,
      );
      expect(where.slaDueAt).toBeUndefined();
    });

    it('filtra por intervalo de atribuicao (apenas inicio e apenas fim)', () => {
      const from = buildCollectionCasesWhere(
        { ...base, assignedFrom: '2026-06-01' },
        now,
      );
      expect(from.assignedAt).toEqual({
        gte: new Date('2026-06-01T00:00:00.000Z'),
      });
      const to = buildCollectionCasesWhere(
        { ...base, assignedTo: '2026-06-02' },
        now,
      );
      expect(to.assignedAt).toEqual({
        lte: new Date('2026-06-02T23:59:59.999Z'),
      });
    });

    it('contatado com ids antigos exclui os ids de ciclo anterior', () => {
      const where = buildCollectionCasesWhere(
        { ...base, interactionStatus: 'contacted' },
        now,
        { staleContactCaseIds: ['a', 'b'] },
      );
      expect(where.AND).toEqual([{ id: { notIn: ['a', 'b'] } }]);
    });

    it('nao contatado inclui ids antigos no OR', () => {
      const where = buildCollectionCasesWhere(
        { ...base, interactionStatus: 'not_contacted' },
        now,
        { staleContactCaseIds: ['a'] },
      );
      expect(where.AND).toEqual([
        {
          OR: [
            { collectionAttempts: { none: { isAutomatic: false } } },
            { id: { in: ['a'] } },
          ],
        },
      ]);
    });
  });

  describe('buildCollectionCasesOrderBy', () => {
    it('usa ordenacao padrao sem sortBy', () => {
      expect(buildCollectionCasesOrderBy(base)).toEqual([
        { daysOverdue: 'desc' },
        { outstandingAmount: 'desc' },
      ]);
    });

    it('ordena por daysOverdue e totalOutstanding com desempate', () => {
      expect(
        buildCollectionCasesOrderBy({ ...base, sortBy: 'daysOverdue' }),
      ).toEqual([{ daysOverdue: 'desc' }, { outstandingAmount: 'desc' }]);
      expect(
        buildCollectionCasesOrderBy({
          ...base,
          sortBy: 'totalOutstanding',
          sortDirection: 'asc',
        }),
      ).toEqual([{ outstandingAmount: 'asc' }, { daysOverdue: 'desc' }]);
    });

    it.each([
      ['firstOverdueDate', 'asc', { daysOverdue: 'desc' }],
      ['firstOverdueDate', 'desc', { daysOverdue: 'asc' }],
      ['slaDueAt', 'asc', { slaDueAt: 'asc' }],
      ['createdAt', 'desc', { createdAt: 'desc' }],
      ['updatedAt', 'asc', { updatedAt: 'asc' }],
      ['lastContactAt', 'desc', { lastContactAt: 'desc' }],
    ] as const)('mapeia %s (%s)', (sortBy, sortDirection, primary) => {
      expect(
        buildCollectionCasesOrderBy({ ...base, sortBy, sortDirection }),
      ).toEqual([
        primary,
        { daysOverdue: 'desc' },
        { outstandingAmount: 'desc' },
      ]);
    });

    it('cai no campo daysOverdue para sortBy desconhecido', () => {
      expect(
        buildCollectionCasesOrderBy({ ...base, sortBy: 'outro' as never })[0],
      ).toEqual({ daysOverdue: 'desc' });
    });
  });

  describe('filterMockCollectionCases', () => {
    const run = (params: Record<string, unknown>, records = [createRecord()]) =>
      filterMockCollectionCases(records, { ...base, ...params }, now);

    it('filtra por status, prioridade e responsavel', () => {
      expect(run({ status: 'CLOSED' })).toHaveLength(0);
      expect(run({ status: 'IN_COLLECTION' })).toHaveLength(1);
      expect(run({ priority: 'LOW' })).toHaveLength(0);
      expect(run({ assignedToId: 'unassigned' })).toHaveLength(0);
      expect(
        run({ assignedToId: 'unassigned' }, [
          createRecord({ assignedUserId: null }),
        ]),
      ).toHaveLength(1);
      expect(run({ assignedToId: 'outro' })).toHaveLength(0);
      expect(run({ assignedToId: 'usr_1' })).toHaveLength(1);
    });

    it('filtra por HSM, contrato e busca textual', () => {
      expect(run({ hsmDeliveryState: 'READ' })).toHaveLength(0);
      expect(run({ contractStatus: 'CANCELLED' })).toHaveLength(0);
      expect(run({ search: 'maria' })).toHaveLength(1);
      expect(run({ search: 'ext-9' })).toHaveLength(1);
      expect(run({ search: 'inexistente' })).toHaveLength(0);
    });

    it('filtra por faixas de dias e valor', () => {
      expect(run({ daysOverdueMin: 31 })).toHaveLength(0);
      expect(run({ daysOverdueMax: 29 })).toHaveLength(0);
      expect(run({ totalOutstandingMin: 1001 })).toHaveLength(0);
      expect(run({ totalOutstandingMax: 999 })).toHaveLength(0);
      expect(
        run({
          daysOverdueMin: 10,
          daysOverdueMax: 40,
          totalOutstandingMin: 500,
          totalOutstandingMax: 2000,
        }),
      ).toHaveLength(1);
    });

    it('filtra por 1o e 2o vencimento (com e sem firstOverdueDate)', () => {
      expect(run({ firstDueDate: '2026-05-02' })).toHaveLength(0);
      expect(run({ firstDueDate: '2026-05-01' })).toHaveLength(1);
      expect(run({ secondDueDate: '2026-05-01' })).toHaveLength(0);
      expect(run({ secondDueDate: '2026-05-31' })).toHaveLength(1);
      const semData = createRecord({ firstOverdueDate: null, daysOverdue: 10 });
      expect(run({ firstDueDate: '2020-01-01' }, [semData])).toHaveLength(0);
    });

    it('filtra por SLA', () => {
      const semSla = createRecord();
      const vencido = createRecord({ slaDueAt: '2026-06-09T10:00:00.000Z' });
      const hoje = createRecord({ slaDueAt: '2026-06-10T15:00:00.000Z' });
      const futuro = createRecord({ slaDueAt: '2026-06-20T15:00:00.000Z' });
      const todos = [semSla, vencido, hoje, futuro];
      expect(run({ slaStatus: 'no_sla' }, todos)).toEqual([semSla]);
      expect(run({ slaStatus: 'overdue' }, todos)).toEqual([vencido]);
      expect(run({ slaStatus: 'due_today' }, todos)).toEqual([hoje]);
      expect(run({ slaStatus: 'ok' }, todos)).toEqual([hoje, futuro]);
    });

    it('SLA vencido ignora casos finalizados', () => {
      const finalizado = createRecord({
        status: 'CLOSED',
        slaDueAt: '2026-06-09T10:00:00.000Z',
      });
      expect(
        run({ slaStatus: 'overdue', status: 'CLOSED' }, [finalizado]),
      ).toHaveLength(0);
    });

    it('filtra casos criados hoje', () => {
      const hoje = createRecord({ createdAt: '2026-06-10T09:00:00.000Z' });
      const antigo = createRecord({ createdAt: '2026-06-01T09:00:00.000Z' });
      expect(run({ createdToday: true }, [hoje, antigo])).toEqual([hoje]);
    });

    it('filtra por intervalo de atribuicao', () => {
      const semAtrib = createRecord({ assignedAt: null });
      expect(run({ assignedFrom: '2026-06-01' }, [semAtrib])).toHaveLength(0);
      expect(run({ assignedFrom: '2026-06-06' })).toHaveLength(0);
      expect(run({ assignedTo: '2026-06-04' })).toHaveLength(0);
      expect(
        run({ assignedFrom: '2026-06-05', assignedTo: '2026-06-05' }),
      ).toHaveLength(1);
    });

    it('filtra por interacao, promessa e origem', () => {
      const contatado = createRecord({ totalAttempts: 3 });
      expect(run({ interactionStatus: 'contacted' })).toHaveLength(0);
      expect(run({ interactionStatus: 'contacted' }, [contatado])).toHaveLength(
        1,
      );
      expect(
        run({ interactionStatus: 'not_contacted' }, [contatado]),
      ).toHaveLength(0);
      expect(run({ interactionStatus: 'none' })).toHaveLength(1);
      expect(run({ promiseStatus: 'ACTIVE' })).toHaveLength(0);
      expect(
        run({ promiseStatus: 'ACTIVE' }, [
          createRecord({ paymentPromiseStatuses: ['ACTIVE'] }),
        ]),
      ).toHaveLength(1);
      expect(run({ origin: 'PRE_COLLECTION' })).toHaveLength(0);
      expect(run({ origin: 'null' })).toHaveLength(1);
    });

    it('sem status e sem busca esconde casos finalizados', () => {
      expect(run({}, [createRecord({ status: 'CLOSED' })])).toHaveLength(0);
    });
  });

  describe('sortMockCollectionCases', () => {
    const a = createRecord({
      id: 'a',
      daysOverdue: 10,
      outstandingAmount: '300.00',
      slaDueAt: '2026-06-12T00:00:00.000Z',
      firstOverdueDate: '2026-05-01T00:00:00.000Z',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-03T00:00:00.000Z',
    });
    const b = createRecord({
      id: 'b',
      daysOverdue: 20,
      outstandingAmount: '100.00',
      slaDueAt: null,
      firstOverdueDate: '2026-04-01T00:00:00.000Z',
      createdAt: '2026-06-02T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
    });
    const ids = (list: MockCollectionCaseListRecord[]) =>
      list.map((item) => item.id);

    it('sem sortBy ordena por atraso e depois por valor', () => {
      const c = createRecord({
        id: 'c',
        daysOverdue: 20,
        outstandingAmount: '500.00',
      });
      expect(ids(sortMockCollectionCases([a, b, c], base))).toEqual([
        'c',
        'b',
        'a',
      ]);
    });

    it.each([
      ['daysOverdue', 'asc', ['a', 'b']],
      ['totalOutstanding', 'asc', ['b', 'a']],
      ['firstOverdueDate', 'asc', ['b', 'a']],
      ['slaDueAt', 'asc', ['a', 'b']],
      ['updatedAt', 'desc', ['a', 'b']],
      ['createdAt', 'desc', ['b', 'a']],
      ['lastContactAt', 'asc', ['b', 'a']],
    ] as const)('ordena por %s %s', (sortBy, sortDirection, expected) => {
      expect(
        ids(
          sortMockCollectionCases([a, b], { ...base, sortBy, sortDirection }),
        ),
      ).toEqual(expected);
    });

    it('slaDueAt desc coloca sem SLA primeiro', () => {
      expect(
        ids(sortMockCollectionCases([a, b], { ...base, sortBy: 'slaDueAt' })),
      ).toEqual(['b', 'a']);
    });

    it('mantem a ordem para sortBy desconhecido', () => {
      expect(
        ids(sortMockCollectionCases([a, b], { ...base, sortBy: 'x' as never })),
      ).toEqual(['a', 'b']);
    });
  });

  describe('toListItemResponse', () => {
    it('mapeia o registro e calcula a 2a data de vencimento', () => {
      const result = toListItemResponse(createRecord());
      expect(result.secondOverdueDate).toBe('2026-05-31T00:00:00.000Z');
      expect(result.contractErpStatus).toBeNull();
      expect(result.hsmDeliveryState).toBeNull();
      expect(result.origin).toBeNull();
    });

    it('sem primeira data nao informa a segunda', () => {
      expect(
        toListItemResponse(createRecord({ firstOverdueDate: null }))
          .secondOverdueDate,
      ).toBeNull();
    });
  });
});
