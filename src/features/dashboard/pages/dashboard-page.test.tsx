import { type ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/features/dashboard/pages/dashboard-page';
import { createMockSession } from '@/test/auth-test-utils';
import { mockDashboardSummaryResponse } from '@/test/fixtures/api-fixtures';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

vi.mock('@/features/dashboard/services/dashboard.service', () => ({
  getDashboardSummary: vi.fn(),
  getDashboardOperations: vi.fn(),
}));

// Mini-ranking do painel: fora do foco destes testes (evita chamada de rede real).
vi.mock('@/features/ranking/services/ranking.service', () => ({
  getRecoveryRanking: vi.fn().mockResolvedValue({
    periodFrom: '2026-11-01T00:00:00.000Z',
    periodTo: '2026-12-01T00:00:00.000Z',
    totalRecoveredAmount: '0.00',
    totalRecoveredCases: 0,
    ranking: [],
  }),
}));

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCases: vi.fn(),
    getCollectionCaseById: vi.fn(),
    getCollectionCasePortfolios: vi.fn(),
    getRenegotiationSummary: vi.fn(),
  }),
);

import {
  getCollectionCases,
  getCollectionCasePortfolios,
  getRenegotiationSummary,
} from '@/features/collection-cases/services/collection-cases.service';
import {
  getDashboardOperations,
  getDashboardSummary,
} from '@/features/dashboard/services/dashboard.service';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCollectionCasePortfolios).mockResolvedValue({
      portfolios: [],
    });
    vi.mocked(getRenegotiationSummary).mockResolvedValue({
      available: true,
      count: 38,
      openAmount: '5416.01',
    });
    // Cartão de HSM: contagens por estado de entrega (limit 1, só o total).
    vi.mocked(getCollectionCases).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 1, total: 0, totalPages: 1 },
    });
  });

  it('renderiza o painel da supervisão com dados da API', async () => {
    vi.mocked(getDashboardSummary).mockResolvedValue(
      mockDashboardSummaryResponse,
    );

    renderWithProviders(<DashboardPage />, {
      session: createMockSession(),
    });

    expect(await screen.findByText('Supervisão')).toBeInTheDocument();
    expect(screen.getByText('Visão geral da operação')).toBeInTheDocument();
    expect(screen.getByText('Precisa de ação')).toBeInTheDocument();
    expect(screen.getByText('Carga por atendente')).toBeInTheDocument();
    expect(
      screen.getAllByText('Elegíveis p/ cancelamento').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 184.750,42').length).toBeGreaterThan(0);
    // Card "Renegociados em aberto" vem da fonte da aba (38), nao do status extinto.
    expect(await screen.findByText('38')).toBeInTheDocument();
    expect(getDashboardOperations).not.toHaveBeenCalled();
  });

  it('mostra recuperado após contato e os que pagaram sozinhos separados', async () => {
    vi.mocked(getDashboardSummary).mockResolvedValue({
      ...mockDashboardSummaryResponse,
      metrics: {
        ...mockDashboardSummaryResponse.metrics,
        recoveredMonth: '7826.10',
        recoveredAfterContactMonth: '299.70',
      },
    });

    renderWithProviders(<DashboardPage />, {
      session: createMockSession(),
    });

    expect(await screen.findByText('Recuperado no mês')).toBeInTheDocument();
    expect(screen.getByText('R$ 299,70')).toBeInTheDocument();
    expect(
      screen.getByText(/R\$ 7\.526,40 pagaram sozinhos/),
    ).toBeInTheDocument();
  });

  it('ERP indisponivel: renegociados mostra "—" e aviso, nao 0', async () => {
    vi.mocked(getDashboardSummary).mockResolvedValue(
      mockDashboardSummaryResponse,
    );
    vi.mocked(getRenegotiationSummary).mockResolvedValue({
      available: false,
      count: 0,
      openAmount: '0.00',
    });

    renderWithProviders(<DashboardPage />, {
      session: createMockSession(),
    });

    await waitFor(() => {
      expect(screen.getByText('não foi possível carregar')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'tentar novamente' }),
    ).toBeInTheDocument();
  });

  it('exibe estado de erro quando a API falha', async () => {
    vi.mocked(getDashboardSummary).mockRejectedValue(new Error('offline'));
    vi.mocked(getCollectionCases).mockRejectedValue(new Error('offline'));

    renderWithProviders(<DashboardPage />, {
      session: createMockSession(),
    });

    expect(
      await screen.findByText('Não foi possível carregar o dashboard'),
    ).toBeInTheDocument();
  });
});
