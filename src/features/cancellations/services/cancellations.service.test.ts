import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeCancellationStep,
  createElevenCancellationRequest,
} from '@/features/cancellations/services/cancellations.service';

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

describe('cancellations.service', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { id: 'r1' } });
  });

  it('completa uma etapa de cancelamento via POST', async () => {
    const payload = { notes: 'ok' } as Parameters<
      typeof completeCancellationStep
    >[2];
    const result = await completeCancellationStep('c1', 'STEP_A', payload);

    expect(request).toHaveBeenCalledWith({
      path: '/cancellations/c1/steps/STEP_A/complete',
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 'r1' });
  });

  it('cria a solicitacao Eleven via POST', async () => {
    const payload = { reason: 'x' } as Parameters<
      typeof createElevenCancellationRequest
    >[1];
    const result = await createElevenCancellationRequest('c1', payload);

    expect(request).toHaveBeenCalledWith({
      path: '/cancellations/c1/eleven/request',
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 'r1' });
  });
});
