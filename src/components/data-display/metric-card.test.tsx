import { describe, expect, it } from 'vitest';
import { Landmark } from 'lucide-react';
import { screen } from '@testing-library/react';
import { MetricCard } from '@/components/data-display/metric-card';
import { renderWithProviders } from '@/test/test-utils';

describe('MetricCard', () => {
  it('renderiza titulo e valor', () => {
    renderWithProviders(
      <MetricCard
        title="Clientes inadimplentes"
        value="128"
        description="Descrição"
        icon={Landmark}
        variant="danger"
      />,
    );

    expect(screen.getByText('Clientes inadimplentes')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
  });

  it('aplica variante correta', () => {
    renderWithProviders(
      <MetricCard
        title="A"
        value="1"
        description="Descrição"
        variant="success"
      />,
    );

    expect(screen.getByText('1').closest('article')).toHaveClass(
      'border-l-success',
    );
  });

  it('renderiza estado loading', () => {
    renderWithProviders(
      <MetricCard title="A" value="1" description="Descrição" loading />,
    );

    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
