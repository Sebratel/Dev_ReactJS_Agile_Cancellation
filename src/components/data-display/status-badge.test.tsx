import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { StatusBadge } from '@/components/data-display/status-badge';
import { renderWithProviders } from '@/test/test-utils';

describe('StatusBadge', () => {
  it('renderiza success', () => {
    renderWithProviders(<StatusBadge label="Concluído" variant="success" />);
    expect(screen.getByText('Concluído')).toHaveClass('text-success');
  });

  it('renderiza danger', () => {
    renderWithProviders(<StatusBadge label="Crítico" variant="danger" />);
    expect(screen.getByText('Crítico')).toHaveClass('text-danger');
  });

  it('renderiza neutral', () => {
    renderWithProviders(<StatusBadge label="Aguardando" variant="neutral" />);
    expect(screen.getByText('Aguardando')).toHaveClass('text-neutral');
  });
});
