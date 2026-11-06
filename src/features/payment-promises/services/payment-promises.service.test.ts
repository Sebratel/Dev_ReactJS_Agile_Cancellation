import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPaymentPromisesPath,
  getPaymentPromises,
  getPaymentPromisesSummary,
} from '@/features/payment-promises/services/payment-promises.service';

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

describe('payment-promises.service', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { v: 1 } });
  });

  it('usa o caminho base sem filtros', () => {
    expect(buildPaymentPromisesPath()).toBe('/payment-promises');
  });

  it('inclui filtros e remove espacos da busca', () => {
    const path = buildPaymentPromisesPath({
      status: 'ACTIVE',
      caseSituation: 'PAID',
      from: '2026-01-01',
      to: '2026-01-31',
      assignedUserId: 'u1',
      search: '  ana ',
      page: 2,
      limit: 10,
    });
    const params = new URLSearchParams(path.split('?')[1]);

    expect(params.get('status')).toBe('ACTIVE');
    expect(params.get('assignedUserId')).toBe('u1');
    expect(params.get('search')).toBe('ana');
    expect(params.get('page')).toBe('2');
  });

  it('ignora busca composta so de espacos', () => {
    expect(buildPaymentPromisesPath({ search: '   ' })).toBe(
      '/payment-promises',
    );
  });

  it('busca lista e resumo', async () => {
    await getPaymentPromises({ page: 1 });
    const summary = await getPaymentPromisesSummary();

    expect(request.mock.calls[0]?.[0].path).toBe('/payment-promises?page=1');
    expect(request.mock.calls[1]?.[0].path).toBe('/payment-promises/summary');
    expect(summary).toEqual({ v: 1 });
  });
});
