import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OperationalMetricsGrid } from '@/features/dashboard/components/operational-metrics-grid';
import { mapDashboardOperationsToGroups } from '@/features/dashboard/utils/dashboard.mapper';
import { mockDashboardOperationsResponse } from '@/test/fixtures/api-fixtures';
import { renderWithProviders } from '@/test/test-utils';

describe('OperationalMetricsGrid', () => {
  it('renderiza blocos operacionais', () => {
    const groups = mapDashboardOperationsToGroups(
      mockDashboardOperationsResponse,
    );

    renderWithProviders(<OperationalMetricsGrid groups={groups} />);

    expect(screen.getByText('Cobrança')).toBeInTheDocument();
    expect(screen.getByText('Promessas')).toBeInTheDocument();
    expect(screen.getByText('Cancelamentos')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('80,6%')).toBeInTheDocument();
  });
});
