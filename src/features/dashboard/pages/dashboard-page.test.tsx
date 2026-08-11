import { type ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/features/dashboard/pages/dashboard-page';
import { createMockSession } from '@/test/auth-test-utils';
import {
  createMockCollectionCasesPage,
  mockDashboardOperationsResponse,
  mockDashboardSummaryResponse,
} from '@/test/fixtures/api-fixtures';
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
  }),
);

import { getCollectionCases } from '@/features/collection-cases/services/collection-cases.service';
import {
  getDashboardOperations,
  getDashboardSummary,
} from '@/features/dashboard/services/dashboard.service';

describe('DashboardPage', () => {
  it('renderiza KPIs principais, alertas e casos criticos com dados da API', async () => {
    vi.mocked(getDashboardSummary).mockResolvedValue(
      mockDashboardSummaryResponse,
    );
    vi.mocked(getDashboardOperations).mockResolvedValue(
      mockDashboardOperationsResponse,
    );
    vi.mocked(getCollectionCases).mockResolvedValue(
      createMockCollectionCasesPage(1, 5),
    );

    renderWithProviders(<DashboardPage />, {
      session: createMockSession(),
    });

    expect(
      await screen.findByText('Clientes inadimplentes'),
    ).toBeInTheDocument();
    expect(screen.getByText('Dashboard operacional')).toBeInTheDocument();
    expect(await screen.findByText('Casos ativos')).toBeInTheDocument();
    expect(screen.getAllByText('Valor em aberto').length).toBeGreaterThan(0);
    expect(screen.getByText('Em cobrança')).toBeInTheDocument();
    expect(screen.getByText('Elegíveis para cancelamento')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 184.750,42').length).toBeGreaterThan(0);
    expect(screen.getByText('Requer atenção')).toBeInTheDocument();
    expect(screen.getAllByText('Promessas vencidas').length).toBeGreaterThan(1);
    expect(screen.getByText('Casos críticos')).toBeInTheDocument();
    expect(screen.getAllByText('Construtora Horizonte').length).toBeGreaterThan(
      0,
    );
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
