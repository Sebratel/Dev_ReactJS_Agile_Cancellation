import {
  mockAuditLogs,
  resetMockCollectionCases,
} from '@/modules/collection-cases/mocks/collection-cases.mock';
import { CollectionCasesMockRepository } from '@/modules/collection-cases/repositories/collection-cases-mock.repository';

describe('CollectionCasesMockRepository', () => {
  const repository = new CollectionCasesMockRepository();

  beforeEach(() => {
    resetMockCollectionCases();
  });

  it('getPortfolios agrupa por atendente com indicadores', async () => {
    const { portfolios } = await repository.getPortfolios();

    expect(portfolios.length).toBeGreaterThan(0);

    // Cada carteira soma pelo menos 1 caso ativo e expoe todos os indicadores.
    for (const portfolio of portfolios) {
      expect(portfolio.totalActive).toBeGreaterThan(0);
      expect(portfolio.slaOverdue).toBeLessThanOrEqual(portfolio.totalActive);
      expect(portfolio.awaitingReply).toBeLessThanOrEqual(
        portfolio.totalActive,
      );
      expect(portfolio.noManualInteraction).toBeLessThanOrEqual(
        portfolio.totalActive,
      );
      expect(portfolio.totalOutstanding).toMatch(/^\d+\.\d{2}$/);
    }
  });

  it('getPortfolios inclui a carteira sem responsavel (agent null)', async () => {
    const { portfolios } = await repository.getPortfolios();

    // Os mocks tem casos sem atendente atribuido (index % 5 === 0).
    expect(portfolios.some((portfolio) => portfolio.agent === null)).toBe(true);
  });

  it('getPortfolios filtra por assignedToId=unassigned na listagem', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      assignedToId: 'unassigned',
    });

    expect(result.items.length).toBeGreaterThan(0);
  });

  it('pagina corretamente', async () => {
    const result = await repository.listCases({ page: 2, limit: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 35,
      totalPages: 4,
    });
    expect(result.items[0]?.id).toMatch(/^case_/);
  });

  it('filtra por status', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      status: 'IN_COLLECTION',
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.status === 'IN_COLLECTION')).toBe(
      true,
    );
  });

  it('filtra por priority', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      priority: 'HIGH',
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.priority === 'HIGH')).toBe(true);
  });

  it('filtra por search', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      search: 'Horizonte',
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((item) => item.customerName.includes('Horizonte')),
    ).toBe(true);
  });

  it('filtra "nao contatados" (so a tentativa automatica inicial)', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      interactionStatus: 'not_contacted',
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.totalAttempts <= 1)).toBe(true);
  });

  it('filtra "ja contatados" (com tentativa manual do atendente)', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      interactionStatus: 'contacted',
    });

    expect(result.items.every((item) => item.totalAttempts > 1)).toBe(true);
  });

  it('filtra por promessa ativa', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      promiseStatus: 'ACTIVE',
    });

    expect(result.items.length).toBeGreaterThan(0);
  });

  it('combina novos filtros com paginacao', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 5,
      promiseStatus: 'ACTIVE',
      interactionStatus: 'not_contacted',
    });

    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(5);
    expect(result.items.length).toBeLessThanOrEqual(5);
    expect(result.items.every((item) => item.totalAttempts <= 1)).toBe(true);
  });

  it('filtra por range de dias em atraso', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      daysOverdueMin: 100,
      daysOverdueMax: 110,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every(
        (item) => item.daysOverdue >= 100 && item.daysOverdue <= 110,
      ),
    ).toBe(true);
  });

  it('filtra pela data exata do 1o vencimento', async () => {
    const all = await repository.listCases({ page: 1, limit: 100 });
    const sample = all.items.find((item) => item.firstOverdueDate);
    const sampleDate = sample!.firstOverdueDate!.slice(0, 10);

    const result = await repository.listCases({
      page: 1,
      limit: 100,
      firstDueDate: sampleDate,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((item) => item.firstOverdueDate?.slice(0, 10) === sampleDate),
    ).toBe(true);
  });

  it('filtra pela data exata do 2o vencimento', async () => {
    const all = await repository.listCases({ page: 1, limit: 100 });
    const sample = all.items.find((item) => item.secondOverdueDate);
    const sampleDate = sample!.secondOverdueDate!.slice(0, 10);

    const result = await repository.listCases({
      page: 1,
      limit: 100,
      secondDueDate: sampleDate,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((item) => item.secondOverdueDate?.slice(0, 10) === sampleDate),
    ).toBe(true);
  });

  it('filtra por status do contrato', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      contractStatus: 'SUSPENDED',
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((item) => item.contractStatus === 'SUSPENDED'),
    ).toBe(true);
  });

  it('ordena corretamente por dias em atraso asc', async () => {
    const result = await repository.listCases({
      page: 1,
      limit: 100,
      sortBy: 'daysOverdue',
      sortDirection: 'asc',
    });

    const days = result.items.map((item) => item.daysOverdue);
    const sorted = [...days].sort((left, right) => left - right);

    expect(days).toEqual(sorted);
  });

  it('cria tentativa e audit log em mock', async () => {
    const attempt = await repository.createAttempt({
      caseId: 'case_0001',
      input: {
        channel: 'PHONE',
        result: 'NO_ANSWER',
        notes: 'Sem atendimento.',
      },
      performedByUserId: 'usr_marina',
    });

    expect(attempt?.channel).toBe('PHONE');
    expect(attempt?.result).toBe('NO_ANSWER');

    const details = await repository.getCaseById('case_0001');

    expect(details?.attempts.some((item) => item.id === attempt?.id)).toBe(
      true,
    );
    expect(mockAuditLogs).toHaveLength(1);
  });

  it('cria promessa e audit log em mock', async () => {
    const promise = await repository.createPromise({
      caseId: 'case_0001',
      input: {
        promisedAmount: 1200,
        promisedDate: '2026-07-10T00:00:00.000Z',
        notes: 'Promessa mock.',
      },
      createdByUserId: 'usr_marina',
    });

    expect(promise?.promisedAmount).toBe('1200.00');
    expect(promise?.notes).toBe('Promessa mock.');

    const details = await repository.getCaseById('case_0001');

    expect(details?.promises.some((item) => item.id === promise?.id)).toBe(
      true,
    );
    expect(mockAuditLogs).toHaveLength(1);
  });

  it('retorna null ao criar promessa para caso inexistente', async () => {
    const promise = await repository.createPromise({
      caseId: 'case_inexistente',
      input: {
        promisedAmount: 100,
        promisedDate: '2026-07-01T00:00:00.000Z',
      },
      createdByUserId: 'usr_marina',
    });

    expect(promise).toBeNull();
  });

  it('marca promessa ACTIVE como FULFILLED em mock', async () => {
    const created = await repository.createPromise({
      caseId: 'case_0001',
      input: {
        promisedAmount: 900,
        promisedDate: '2026-07-20T00:00:00.000Z',
      },
      createdByUserId: 'usr_marina',
    });

    expect(created?.id).toBeDefined();

    const result = await repository.updatePromiseStatus({
      caseId: 'case_0001',
      promiseId: created!.id,
      action: 'FULFILLED',
      performedByUserId: 'usr_marina',
    });

    expect(result.outcome).toBe('success');
    expect(result.outcome === 'success' && result.promise.status).toBe(
      'FULFILLED',
    );
    expect(result.outcome === 'success' && result.promise.fulfilledAt).toEqual(
      expect.any(String),
    );

    const details = await repository.getCaseById('case_0001');
    const updated = details?.promises.find(
      (promise) => promise.id === created!.id,
    );

    expect(updated?.status).toBe('FULFILLED');
    expect(
      mockAuditLogs.some((entry) => entry.action === 'STATUS_CHANGE'),
    ).toBe(true);
  });

  it('marca promessa ACTIVE como BROKEN em mock', async () => {
    const created = await repository.createPromise({
      caseId: 'case_0001',
      input: {
        promisedAmount: 700,
        promisedDate: '2026-07-25T00:00:00.000Z',
      },
      createdByUserId: 'usr_marina',
    });

    const result = await repository.updatePromiseStatus({
      caseId: 'case_0001',
      promiseId: created!.id,
      action: 'BROKEN',
      performedByUserId: 'usr_marina',
    });

    expect(result.outcome).toBe('success');
    expect(result.outcome === 'success' && result.promise.status).toBe(
      'BROKEN',
    );
  });

  it('marca promessa ACTIVE como CANCELLED em mock', async () => {
    const created = await repository.createPromise({
      caseId: 'case_0001',
      input: {
        promisedAmount: 500,
        promisedDate: '2026-07-30T00:00:00.000Z',
      },
      createdByUserId: 'usr_marina',
    });

    const result = await repository.updatePromiseStatus({
      caseId: 'case_0001',
      promiseId: created!.id,
      action: 'CANCELLED',
      performedByUserId: 'usr_marina',
    });

    expect(result.outcome).toBe('success');
    expect(result.outcome === 'success' && result.promise.status).toBe(
      'CANCELLED',
    );
  });

  it('retorna invalid_transition ao alterar promessa ja resolvida', async () => {
    const created = await repository.createPromise({
      caseId: 'case_0001',
      input: {
        promisedAmount: 400,
        promisedDate: '2026-08-01T00:00:00.000Z',
      },
      createdByUserId: 'usr_marina',
    });

    await repository.updatePromiseStatus({
      caseId: 'case_0001',
      promiseId: created!.id,
      action: 'FULFILLED',
      performedByUserId: 'usr_marina',
    });

    const result = await repository.updatePromiseStatus({
      caseId: 'case_0001',
      promiseId: created!.id,
      action: 'BROKEN',
      performedByUserId: 'usr_marina',
    });

    expect(result.outcome).toBe('invalid_transition');
  });

  it('retorna promise_not_found para promessa de outro caso', async () => {
    const created = await repository.createPromise({
      caseId: 'case_0001',
      input: {
        promisedAmount: 300,
        promisedDate: '2026-08-05T00:00:00.000Z',
      },
      createdByUserId: 'usr_marina',
    });

    const result = await repository.updatePromiseStatus({
      caseId: 'case_0002',
      promiseId: created!.id,
      action: 'FULFILLED',
      performedByUserId: 'usr_marina',
    });

    expect(result.outcome).toBe('promise_not_found');
  });

  it('monta timeline com criacao, tentativas e promessas', async () => {
    const timeline = await repository.getCaseTimeline('case_0001');

    expect(timeline?.caseId).toBe('case_0001');
    expect(
      timeline?.events.some((event) => event.type === 'CASE_CREATED'),
    ).toBe(true);
    expect(
      timeline?.events.some((event) => event.type === 'ATTEMPT_CREATED'),
    ).toBe(true);
  });

  it('retorna null ao buscar timeline de caso inexistente', async () => {
    const timeline = await repository.getCaseTimeline('case_inexistente');

    expect(timeline).toBeNull();
  });

  it('encaminha caso para cancelamento em mock', async () => {
    const result = await repository.sendToCancellation({
      caseId: 'case_0002',
      input: {
        reason: 'Cliente recusou acordo.',
        notes: 'Sem retorno.',
        assignedUserId: 'usr_cancel',
      },
      performedByUserId: 'usr_marina',
    });

    expect(result.outcome).toBe('success');
    expect(
      result.outcome === 'success' && result.cancellationProcess.status,
    ).toBe('PENDING');

    const details = await repository.getCaseById('case_0002');

    expect(details?.status).toBe('CANCELLATION_IN_PROGRESS');
    expect(details?.cancellationProcess?.id).toBe(
      result.outcome === 'success' ? result.cancellationProcess.id : '',
    );
    expect(mockAuditLogs).toHaveLength(1);
  });

  it('retorna already_in_cancellation ao reencaminhar caso', async () => {
    await repository.sendToCancellation({
      caseId: 'case_0002',
      input: { reason: 'Primeiro encaminhamento.', assignedUserId: 'usr_cancel' },
      performedByUserId: 'usr_marina',
    });

    const result = await repository.sendToCancellation({
      caseId: 'case_0002',
      input: { reason: 'Segundo encaminhamento.', assignedUserId: 'usr_cancel' },
      performedByUserId: 'usr_marina',
    });

    expect(result.outcome).toBe('already_in_cancellation');
  });

  it('resume casos por data de 1o e 2o vencimento', async () => {
    const summary = await repository.getOverdueDateSummary({
      page: 1,
      limit: 10,
    });

    expect(summary.firstDueDates.length).toBeGreaterThan(0);
    expect(summary.secondDueDates.length).toBeGreaterThan(0);

    // As contagens devem bater com o total de casos que tem aquela data
    // exata como 1o vencimento, filtrando pelo mesmo criterio usado na tela.
    const sample = summary.firstDueDates[0]!;
    const matching = await repository.listCases({
      page: 1,
      limit: 100,
      firstDueDate: sample.date,
    });
    expect(matching.pagination.total).toBe(sample.count);

    // As datas retornadas sao sempre no formato YYYY-MM-DD.
    expect(sample.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('resumo de vencimento respeita a data do outro campo ja selecionado', async () => {
    const unfiltered = await repository.getOverdueDateSummary({
      page: 1,
      limit: 10,
    });
    const anySecondDate = unfiltered.secondDueDates[0]!.date;

    const filtered = await repository.getOverdueDateSummary({
      page: 1,
      limit: 10,
      secondDueDate: anySecondDate,
    });

    // A soma das contagens de 1o vencimento restringidas pelo 2o vencimento
    // nao pode passar do total original para aquela mesma data.
    for (const item of filtered.firstDueDates) {
      const original = unfiltered.firstDueDates.find(
        (entry) => entry.date === item.date,
      );
      expect(original).toBeDefined();
      expect(item.count).toBeLessThanOrEqual(original!.count);
    }
  });

  it('listCaseIds retorna todos os ids que batem com o filtro, sem paginacao', async () => {
    const ids = await repository.listCaseIds({
      page: 1,
      limit: 10,
      priority: 'HIGH',
    });

    // A tela de "supervisao" so devolve 10 por pagina; listCaseIds precisa
    // trazer o total do grupo filtrado, usado pelo envio de HSM em lote por
    // filtro.
    const paginated = await repository.listCases({
      page: 1,
      limit: 100,
      priority: 'HIGH',
    });
    expect(ids).toHaveLength(paginated.pagination.total);
    expect(new Set(ids)).toEqual(
      new Set(paginated.items.map((item) => item.id)),
    );
  });
});
