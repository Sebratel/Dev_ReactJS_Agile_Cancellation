import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuditLogsPath,
  getAuditLogs,
} from '@/features/auditoria/services/auditoria.service';

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

describe('auditoria.service', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { items: [] } });
  });

  it('usa o caminho base sem filtros', () => {
    expect(buildAuditLogsPath()).toBe('/audit-logs');
  });

  it('inclui apenas filtros preenchidos', () => {
    const path = buildAuditLogsPath({
      page: 2,
      actorId: 'u1',
      entityType: '',
      search: 'login',
    });
    const params = new URLSearchParams(path.split('?')[1]);

    expect(params.get('page')).toBe('2');
    expect(params.get('actorId')).toBe('u1');
    expect(params.get('search')).toBe('login');
    expect(params.has('entityType')).toBe(false);
  });

  it('busca os logs no caminho montado', async () => {
    const result = await getAuditLogs({ page: 1 });

    expect(request).toHaveBeenCalledWith({ path: '/audit-logs?page=1' });
    expect(result).toEqual({ items: [] });
  });
});
