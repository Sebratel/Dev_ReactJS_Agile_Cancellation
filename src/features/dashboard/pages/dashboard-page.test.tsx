import { type ReactNode } from 'react';
import { screen } from '@testing-library/react';
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

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCases: vi.fn(),
    getCollectionCaseById: vi.fn(),
    getCollectionCasePortfolios: vi.fn(),
  }),
);

import {
  getCollectionCases,
  getCollectionCasePortfolios,
} from '@/features/collection-cases/services/collection-cases.service';
import {
  getDashboardOperations,
  getDashboardSummary,
} from '@/features/dashboard/services/dashboard.service';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCollectionCasePortfolios).mockResolvedValue({ portfolios: [] });
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
    expect(getDashboardOperations).not.toHaveBeenCalled();
    expect(getCollectionCases).not.toHaveBeenCalled();
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
