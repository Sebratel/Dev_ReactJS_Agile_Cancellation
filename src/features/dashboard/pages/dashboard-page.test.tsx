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
  }),
);

import { getCollectionCases } from '@/features/collection-cases/services/collection-cases.service';
import {
  getDashboardOperations,
  getDashboardSummary,
} from '@/features/dashboard/services/dashboard.service';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza briefing e triagem operacional com dados da API', async () => {
    vi.mocked(getDashboardSummary).mockResolvedValue(
      mockDashboardSummaryResponse,
    );

    renderWithProviders(<DashboardPage />, {
      session: createMockSession(),
    });

    expect(await screen.findByText('Briefing da operação')).toBeInTheDocument();
    expect(screen.getByText('Triagem operacional')).toBeInTheDocument();
    expect(screen.getAllByText('Prioridades do dia').length).toBeGreaterThan(0);
    expect(screen.getByText('Carteira da equipe')).toBeInTheDocument();
    expect(screen.getByText('Janela selecionada')).toBeInTheDocument();
    expect(
      screen.getAllByText('Elegíveis para cancelamento').length,
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
