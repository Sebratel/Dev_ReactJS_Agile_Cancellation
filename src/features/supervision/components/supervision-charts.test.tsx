import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SupervisionCharts } from '@/features/supervision/components/supervision-charts';
import { type CollectionCasePortfolioSummary } from '@/features/collection-cases/types/collection-cases-api.types';

const portfolios: CollectionCasePortfolioSummary[] = [
  {
    agent: { id: 'u1', name: 'Ana Souza', avatarUrl: null },
    totalActive: 5,
    totalAssigned: 12,
    interacted: 7,
    slaOverdue: 0,
    awaitingReply: 0,
    noManualInteraction: 0,
    totalOutstanding: '0.00',
  },
  {
    agent: null,
    totalActive: 100,
    totalAssigned: 100,
    interacted: 0,
    slaOverdue: 0,
    awaitingReply: 0,
    noManualInteraction: 0,
    totalOutstanding: '0.00',
  },
];

describe('SupervisionCharts', () => {
  it('mostra os 3 títulos e placeholders quando não há dados', () => {
    render(
      <SupervisionCharts portfolios={[]} byStatus={{}} isLoading={false} />,
    );

    expect(screen.getByText('Carga por carteira')).toBeInTheDocument();
    expect(screen.getByText('Desfecho dos casos')).toBeInTheDocument();
    expect(screen.getByText('Esforço por atendente')).toBeInTheDocument();
    expect(
      screen.getAllByText('Sem dados para exibir no momento.'),
    ).toHaveLength(3);
  });

  it('renderiza os gráficos quando há dados', () => {
    render(
      <SupervisionCharts
        portfolios={portfolios}
        byStatus={{ RECOVERED: 10, PAYMENT_MADE: 5, WAITING_TRIAGE: 3 }}
        isLoading={false}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Carga por carteira' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Desfecho dos casos' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Esforço por atendente' }),
    ).toBeInTheDocument();
  });
});
