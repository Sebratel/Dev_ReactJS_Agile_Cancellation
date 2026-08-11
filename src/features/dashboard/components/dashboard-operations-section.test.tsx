import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardOperationsSection } from '@/features/dashboard/components/dashboard-operations-section';
import { mockDashboardOperationsResponse } from '@/test/fixtures/api-fixtures';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/features/dashboard/hooks/use-dashboard-operations', () => ({
  useDashboardOperations: vi.fn(),
}));

import { useDashboardOperations } from '@/features/dashboard/hooks/use-dashboard-operations';

describe('DashboardOperationsSection', () => {
  it('renderiza loading', () => {
    vi.mocked(useDashboardOperations).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardOperations>);

    const { container } = renderWithProviders(<DashboardOperationsSection />);

    expect(screen.getByText('Dashboard operacional')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renderiza erro', () => {
    vi.mocked(useDashboardOperations).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardOperations>);

    renderWithProviders(<DashboardOperationsSection />);

    expect(
      screen.getByText('Não foi possível carregar o dashboard operacional'),
    ).toBeInTheDocument();
  });

  it('retry funciona no estado de erro', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    vi.mocked(useDashboardOperations).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useDashboardOperations>);

    renderWithProviders(<DashboardOperationsSection />);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renderiza secao operacional com metricas formatadas', () => {
    vi.mocked(useDashboardOperations).mockReturnValue({
      data: mockDashboardOperationsResponse,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardOperations>);

    renderWithProviders(<DashboardOperationsSection />);

    expect(screen.getByText('Cobrança')).toBeInTheDocument();
    expect(screen.getByText('Promessas')).toBeInTheDocument();
    expect(screen.getByText('Cancelamentos')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Casos ativos')).toBeInTheDocument();
    expect(screen.getByText('Taxa de cumprimento')).toBeInTheDocument();
    expect(screen.getByText('R$ 184.750,42')).toBeInTheDocument();
    expect(
      screen.getByText('Abrir solicitação Eleven (9)'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Ver supervisão filtrada por SLA vencido',
      }),
    ).toHaveAttribute('href', '/supervisao?slaStatus=overdue');
  });
});
