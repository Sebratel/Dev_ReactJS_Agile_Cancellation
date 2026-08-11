import { type ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecoveryTrendChart from '@/features/dashboard/components/recovery-trend-chart';
import { recoveryTrend } from '@/features/dashboard/mocks/dashboard.mock';
import { renderWithProviders } from '@/test/test-utils';
import { createMockSession } from '@/test/auth-test-utils';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    ComposedChart: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    CartesianGrid: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    Bar: () => <div />,
    Line: () => <div />,
  };
});

describe('RecoveryTrendChart', () => {
  it('recebe e renderiza dados mockados corretamente', () => {
    renderWithProviders(<RecoveryTrendChart data={recoveryTrend} />, {
      session: createMockSession(),
    });

    expect(screen.getByText('Tendência de recuperação')).toBeInTheDocument();
    expect(screen.getByTestId('recovery-trend-chart')).toBeInTheDocument();
  });
});
