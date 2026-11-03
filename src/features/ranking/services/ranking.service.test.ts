import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecoveryRanking } from '@/features/ranking/services/ranking.service';

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

describe('ranking.service', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { v: 1 } });
  });

  it('envia o periodo na query', async () => {
    const result = await getRecoveryRanking(
      'month' as Parameters<typeof getRecoveryRanking>[0],
    );

    expect(request).toHaveBeenCalledWith({
      path: '/dashboard/recovery-ranking?period=month',
    });
    expect(result).toEqual({ v: 1 });
  });
});
