import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SupervisionRenegotiated } from '@/features/supervision/components/supervision-renegotiated';
import { type RenegotiatedHistoryResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { renderWithProviders } from '@/test/test-utils';

const data: RenegotiatedHistoryResponse = {
  items: [
    {
      caseId: 'case_1',
      customerName: 'Andrenise Cristina',
      customerDocument: '03844209077',
      contractCode: '284733',
      contractExternalId: '9234dbc0',
      renegotiationCount: 3,
      firstRenegotiatedAt: '2026-08-01T10:00:00.000Z',
      lastRenegotiatedAt: '2026-09-24T19:40:00.000Z',
      currentStatus: 'RENEGOTIATED',
      isCurrentlyRenegotiated: true,
      openRenegotiationAmount: '359.64',
      outstandingAmount: '359.64',
      assignedToName: 'Luiza Chagas',
    },
  ],
  summary: {
    totalCases: 1,
    totalRenegotiations: 3,
    currentlyRenegotiated: 1,
    openRenegotiationTotal: '359.64',
    totalOutstanding: '359.64',
  },
};

describe('SupervisionRenegotiated', () => {
  it('mostra o resumo e a linha com link para o detalhe do caso', () => {
    renderWithProviders(
      <SupervisionRenegotiated
        data={data}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Clientes renegociados')).toBeInTheDocument();
    expect(screen.getByText('3×')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Andrenise Cristina' });
    expect(link).toHaveAttribute('href', '/supervisao/case_1');
  });

  it('mostra estado vazio quando não há renegociações', () => {
    renderWithProviders(
      <SupervisionRenegotiated
        data={{
          items: [],
          summary: {
            totalCases: 0,
            totalRenegotiations: 0,
            currentlyRenegotiated: 0,
            openRenegotiationTotal: '0.00',
            totalOutstanding: '0.00',
          },
        }}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Nenhuma renegociação registrada'),
    ).toBeInTheDocument();
  });

  it('mostra erro com opção de tentar novamente', () => {
    renderWithProviders(
      <SupervisionRenegotiated
        data={undefined}
        isLoading={false}
        isError
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Não foi possível carregar os renegociados'),
    ).toBeInTheDocument();
  });
});
