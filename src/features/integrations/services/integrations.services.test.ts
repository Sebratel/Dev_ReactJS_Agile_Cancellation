import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIntegrationEvents,
  getIntegrationEventsSummary,
  getSyncHealth,
} from '@/features/integrations/services/integration-events.service';
import { getElevenIntegrationStatus } from '@/features/integrations/services/integrations.service';

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

describe('servicos de integracoes', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { v: 1 } });
  });

  it('lista eventos sem filtros no caminho base', async () => {
    await getIntegrationEvents();

    expect(request).toHaveBeenCalledWith({
      path: '/integration-events',
      method: 'GET',
    });
  });

  it('lista eventos com todos os filtros na query', async () => {
    await getIntegrationEvents({
      status: 'FAILED',
      source: 'ERP',
      eventType: 'SYNC',
      from: '2026-01-01',
      to: '2026-01-31',
      page: 2,
      limit: 10,
    });

    const path = request.mock.calls[0]?.[0].path ?? '';
    const params = new URLSearchParams(path.split('?')[1]);
    expect(params.get('status')).toBe('FAILED');
    expect(params.get('source')).toBe('ERP');
    expect(params.get('eventType')).toBe('SYNC');
    expect(params.get('from')).toBe('2026-01-01');
    expect(params.get('to')).toBe('2026-01-31');
    expect(params.get('page')).toBe('2');
    expect(params.get('limit')).toBe('10');
  });

  it('busca resumo e saude da sincronizacao', async () => {
    await getIntegrationEventsSummary();
    await getSyncHealth();

    expect(request.mock.calls[0]?.[0].path).toBe('/integration-events/summary');
    expect(request.mock.calls[1]?.[0].path).toBe(
      '/integration-events/sync-health',
    );
  });

  it('busca o status da integracao Eleven', async () => {
    const result = await getElevenIntegrationStatus();

    expect(request).toHaveBeenCalledWith({
      path: '/integrations/eleven/status',
      method: 'GET',
    });
    expect(result).toEqual({ v: 1 });
  });
});
