import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  distributePreCollection,
  getPreCollection,
} from '@/features/pre-collection/services/pre-collection.service';

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

describe('pre-collection.service', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { v: 1 } });
  });

  it('busca a lista com a janela de dias', async () => {
    await getPreCollection(7);

    expect(request).toHaveBeenCalledWith({
      path: '/pre-collection?daysWindow=7',
      method: 'GET',
    });
  });

  it('distribui a pre-cobranca via POST', async () => {
    const result = await distributePreCollection();

    expect(request).toHaveBeenCalledWith({
      path: '/pre-collection/distribute',
      method: 'POST',
    });
    expect(result).toEqual({ v: 1 });
  });
});
