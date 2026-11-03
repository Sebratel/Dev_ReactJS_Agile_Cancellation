import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as service from '@/features/collection-cases/services/collection-cases.service';

const { request } = vi.hoisted(() => ({
  request:
    vi.fn<
      (arg: {
        path: string;
        method?: string;
        body?: string;
      }) => Promise<unknown>
    >(),
}));

vi.mock('@/services/api/http-client', () => ({
  httpClient: { request },
}));

describe('collection-cases.service', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { ok: true } });
  });

  it('monta a query da lista com defaults e ignora valores vazios', () => {
    const path = service.buildCollectionCasesPath({
      search: '',
      status: undefined,
    });
    expect(path).toBe('/collection-cases?page=1&limit=10');
  });

  it('inclui todos os filtros informados na query da lista', () => {
    const path = service.buildCollectionCasesPath({
      page: 3,
      limit: 25,
      status: 'OPEN',
      priority: 'HIGH',
      assignedToId: 'u1',
      search: 'ana',
      daysOverdueMin: 5,
      sortBy: 'daysOverdue',
      sortDirection: 'desc',
      createdToday: true,
    });
    const params = new URLSearchParams(path.split('?')[1]);

    expect(params.get('page')).toBe('3');
    expect(params.get('limit')).toBe('25');
    expect(params.get('status')).toBe('OPEN');
    expect(params.get('priority')).toBe('HIGH');
    expect(params.get('assignedToId')).toBe('u1');
    expect(params.get('search')).toBe('ana');
    expect(params.get('daysOverdueMin')).toBe('5');
    expect(params.get('sortBy')).toBe('daysOverdue');
    expect(params.get('createdToday')).toBe('true');
  });

  it('getCollectionCases retorna o corpo da resposta', async () => {
    const result = await service.getCollectionCases({ page: 2 });

    expect(request).toHaveBeenCalledWith({
      path: '/collection-cases?page=2&limit=10',
    });
    expect(result).toEqual({ ok: true });
  });

  it('resumo de vencimentos remove paginacao e ordenacao', async () => {
    await service.getOverdueDateSummary({
      page: 2,
      limit: 50,
      sortBy: 'daysOverdue',
      sortDirection: 'asc',
      status: 'OPEN',
    });

    const call = request.mock.calls[0]?.[0];
    expect(call?.path).toBe(
      '/collection-cases/overdue-dates-summary?status=OPEN',
    );
  });

  it.each([
    [
      'getCollectionCasePortfolios',
      () => service.getCollectionCasePortfolios(),
      '/collection-cases/portfolios',
    ],
    [
      'getCollectionCasesStatusSummary',
      () => service.getCollectionCasesStatusSummary(),
      '/collection-cases/status-summary',
    ],
    [
      'getCollectionCasesIntakeSummary',
      () => service.getCollectionCasesIntakeSummary(),
      '/collection-cases/intake-summary',
    ],
    [
      'getRenegotiatedHistory',
      () => service.getRenegotiatedHistory(),
      '/erp/renegotiation-history',
    ],
    [
      'getRenegotiationSummary',
      () => service.getRenegotiationSummary(),
      '/erp/renegotiation-summary',
    ],
    [
      'getRenegotiationDetail',
      () => service.getRenegotiationDetail('c9'),
      '/erp/renegotiation-detail/c9',
    ],
    [
      'getCollectionCaseById',
      () => service.getCollectionCaseById('k1'),
      '/collection-cases/k1',
    ],
    [
      'getCollectionCaseTimeline',
      () => service.getCollectionCaseTimeline('k1'),
      '/collection-cases/k1/timeline',
    ],
    [
      'getBulkContactWhatsAppJob',
      () => service.getBulkContactWhatsAppJob('j1'),
      '/bulk-contact-whatsapp/j1',
    ],
  ])('%s faz GET no caminho correto', async (_name, call, path) => {
    const result = await call();

    expect(request).toHaveBeenCalledWith({ path });
    expect(result).toEqual({ ok: true });
  });

  it('listBulkContactWhatsAppJobs envia page e limit', async () => {
    await service.listBulkContactWhatsAppJobs({ page: 2, limit: 5 });

    expect(request).toHaveBeenCalledWith({
      path: '/bulk-contact-whatsapp?page=2&limit=5',
    });
  });

  it.each([
    [
      'sendCaseToCancellation',
      () =>
        service.sendCaseToCancellation('k1', {
          reason: 'x',
        } as Parameters<typeof service.sendCaseToCancellation>[1]),
      '/collection-cases/k1/send-to-cancellation',
      'POST',
      true,
    ],
    [
      'revertCancellation',
      () =>
        service.revertCancellation('k1', {
          reason: 'x',
        }),
      '/collection-cases/k1/revert-cancellation',
      'POST',
      true,
    ],
    [
      'assignCase',
      () =>
        service.assignCase('k1', {
          assignedUserId: 'u1',
        }),
      '/collection-cases/k1/assign',
      'PATCH',
      true,
    ],
    [
      'createCollectionAttempt',
      () =>
        service.createCollectionAttempt('k1', {
          notes: 'x',
        } as Parameters<typeof service.createCollectionAttempt>[1]),
      '/collection-cases/k1/attempts',
      'POST',
      true,
    ],
    [
      'contactCustomerByWhatsApp',
      () => service.contactCustomerByWhatsApp('k1'),
      '/collection-cases/k1/contact-whatsapp',
      'POST',
      false,
    ],
    [
      'createPaymentPromise',
      () =>
        service.createPaymentPromise('k1', {
          promisedAmount: 1,
          promisedDate: '2026-01-01',
        }),
      '/collection-cases/k1/promises',
      'POST',
      true,
    ],
    [
      'fulfillPaymentPromise',
      () => service.fulfillPaymentPromise('k1', 'p1'),
      '/collection-cases/k1/promises/p1/fulfill',
      'POST',
      true,
    ],
    [
      'breakPaymentPromise',
      () => service.breakPaymentPromise('k1', 'p1'),
      '/collection-cases/k1/promises/p1/break',
      'POST',
      true,
    ],
    [
      'cancelPaymentPromise',
      () => service.cancelPaymentPromise('k1', 'p1'),
      '/collection-cases/k1/promises/p1/cancel',
      'POST',
      true,
    ],
    [
      'recoverCancelledCase',
      () => service.recoverCancelledCase('k1'),
      '/collection-cases/k1/recover-cancelled',
      'POST',
      false,
    ],
    [
      'bulkAssignCases',
      () =>
        service.bulkAssignCases({
          caseIds: ['a'],
        } as Parameters<typeof service.bulkAssignCases>[0]),
      '/collection-cases/bulk-assign',
      'POST',
      true,
    ],
    [
      'bulkSendToCancellation',
      () =>
        service.bulkSendToCancellation({
          caseIds: ['a'],
        } as Parameters<typeof service.bulkSendToCancellation>[0]),
      '/collection-cases/send-to-cancellation-bulk',
      'POST',
      true,
    ],
    [
      'createBulkContactWhatsAppJob',
      () => service.createBulkContactWhatsAppJob(['a', 'b']),
      '/bulk-contact-whatsapp',
      'POST',
      true,
    ],
    [
      'createBulkContactWhatsAppJobByFilter',
      () => service.createBulkContactWhatsAppJobByFilter({ status: 'OPEN' }),
      '/bulk-contact-whatsapp/by-filter',
      'POST',
      true,
    ],
    [
      'autoDistribute',
      () =>
        service.autoDistribute(
          {} as Parameters<typeof service.autoDistribute>[0],
        ),
      '/collection-cases/auto-distribute',
      'POST',
      true,
    ],
  ])(
    '%s usa o metodo e caminho corretos',
    async (_name, call, path, method, hasBody) => {
      const result = await call();

      const arg = request.mock.calls[0]?.[0];
      expect(arg?.path).toBe(path);
      expect(arg?.method).toBe(method);
      expect(Boolean(arg?.body)).toBe(hasBody);
      expect(result).toEqual({ ok: true });
    },
  );

  it('serializa os ids no corpo do envio em lote', async () => {
    await service.createBulkContactWhatsAppJob(['a', 'b']);

    expect(request.mock.calls[0]?.[0].body).toBe(
      JSON.stringify({ caseIds: ['a', 'b'] }),
    );
  });
});
