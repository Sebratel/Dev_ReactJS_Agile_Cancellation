import { type ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StatusDistributionChart from '@/features/dashboard/components/status-distribution-chart';
import { statusDistribution } from '@/features/dashboard/mocks/dashboard.mock';
import { renderWithProviders } from '@/test/test-utils';
import { createMockSession } from '@/test/auth-test-utils';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    CartesianGrid: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    Tooltip: () => <div />,
    Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Cell: ({ fill }: { fill: string }) => <span>{fill}</span>,
  };
});

describe('StatusDistributionChart', () => {
  it('recebe e renderiza dados mockados corretamente', () => {
    renderWithProviders(<StatusDistributionChart data={statusDistribution} />, {
      session: createMockSession(),
    });

    expect(screen.getByText('Distribuição por status')).toBeInTheDocument();
    expect(screen.getByTestId('status-distribution-chart')).toBeInTheDocument();
  });
});

describe('StatusDistributionChart — carteira x historico', () => {
  it('separa a carteira ativa do historico de finalizados', () => {
    renderWithProviders(
      <StatusDistributionChart
        data={[
          {
            label: 'Aguardando triagem',
            count: 589,
            variant: 'neutral',
            group: 'portfolio',
          },
          {
            label: 'Encerrado',
            count: 2091,
            variant: 'neutral',
            group: 'history',
          },
        ]}
      />,
      { session: createMockSession() },
    );

    expect(screen.getByText('Carteira ativa')).toBeInTheDocument();
    expect(screen.getByText('Histórico (finalizados)')).toBeInTheDocument();
    expect(
      screen.getByTestId('status-distribution-chart-history'),
    ).toBeInTheDocument();
  });
});
