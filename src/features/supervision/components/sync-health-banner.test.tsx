import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SyncHealthBanner } from '@/features/supervision/components/sync-health-banner';

const useSyncHealth = vi.fn();

vi.mock('@/features/integrations/hooks/use-integration-events', () => ({
  useSyncHealth: (): unknown => useSyncHealth(),
}));

function mockData(overrides: Record<string, unknown> = {}) {
  useSyncHealth.mockReturnValue({
    isLoading: false,
    isError: false,
    data: {
      lastErpSyncAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      lastIngestEventAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
      lastNewCaseAt: new Date(Date.now() - 48 * 3_600_000).toISOString(),
      newCasesLast24h: 0,
      newCasesLast7d: 104,
      ...overrides,
    },
  });
}

describe('SyncHealthBanner', () => {
  beforeEach(() => {
    useSyncHealth.mockReset();
  });

  it('mostra "Sincronização ativa" quando o job rodou ha pouco', () => {
    mockData();
    render(<SyncHealthBanner />);
    expect(screen.getByText('Sincronização ativa')).toBeInTheDocument();
    expect(screen.getByText('104')).toBeInTheDocument();
  });

  it('mostra "Sincronização parada" quando o job nao roda ha muito', () => {
    mockData({
      lastErpSyncAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    });
    render(<SyncHealthBanner />);
    expect(screen.getByText('Sincronização parada')).toBeInTheDocument();
  });

  it('alerta quando nao ha entrada de casos ha 7 dias', () => {
    mockData({ newCasesLast7d: 0, newCasesLast24h: 0 });
    render(<SyncHealthBanner />);
    expect(
      screen.getByText('Sem entrada de casos há 7 dias — verifique o feed do ERP.'),
    ).toBeInTheDocument();
  });

  it('nao renderiza nada enquanto carrega', () => {
    useSyncHealth.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });
    const { container } = render(<SyncHealthBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
