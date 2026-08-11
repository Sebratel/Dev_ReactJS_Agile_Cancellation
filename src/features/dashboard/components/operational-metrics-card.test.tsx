import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OperationalMetricsCard } from '@/features/dashboard/components/operational-metrics-card';
import { renderWithProviders } from '@/test/test-utils';

describe('OperationalMetricsCard', () => {
  it('renderiza link acessivel quando href esta definido', () => {
    renderWithProviders(
      <OperationalMetricsCard
        metric={{
          key: 'overdueSlaCases',
          label: 'SLA vencido',
          value: '7',
          description: 'Itens fora do prazo operacional definido.',
          href: '/supervisao?slaStatus=overdue',
          ariaLabel: 'Ver supervisão filtrada por SLA vencido',
        }}
      />,
    );

    const link = screen.getByRole('link', {
      name: 'Ver supervisão filtrada por SLA vencido',
    });

    expect(link).toHaveAttribute('href', '/supervisao?slaStatus=overdue');
  });

  it('renderiza card estatico quando nao ha href', () => {
    renderWithProviders(
      <OperationalMetricsCard
        metric={{
          key: 'fulfillmentRate',
          label: 'Taxa de cumprimento',
          value: '80,6%',
          description: 'Relação entre promessas cumpridas e quebradas.',
        }}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Taxa de cumprimento')).toBeInTheDocument();
  });
});
