import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCancellationReasons,
  getDashboardOperations,
  getDashboardSummary,
} from '@/features/dashboard/services/dashboard.service';

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

describe('dashboard.service', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { v: 1 } });
  });

  it.each([
    ['resumo', getDashboardSummary, '/dashboard/summary'],
    ['operacao', getDashboardOperations, '/dashboard/operations'],
    [
      'motivos de cancelamento',
      getCancellationReasons,
      '/dashboard/cancellation-reasons',
    ],
  ])('busca %s no endpoint correto', async (_n, call, path) => {
    const result = await call();

    expect(request).toHaveBeenCalledWith({ path });
    expect(result).toEqual({ v: 1 });
  });
});
