import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PreCollectionPage from '@/features/pre-collection/pages/pre-collection-page';
import { renderWithProviders } from '@/test/test-utils';
import { type PreCollectionListResponse } from '@/features/pre-collection/types/pre-collection-api.types';

const usePreCollection = vi.fn();

vi.mock('@/features/pre-collection/hooks/use-pre-collection', () => ({
  usePreCollection: (daysWindow: number): unknown =>
    usePreCollection(daysWindow),
  useDistributePreCollection: (): unknown => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function buildData(
  overrides: Partial<PreCollectionListResponse> = {},
): PreCollectionListResponse {
  return {
    daysWindow: 7,
    generatedAt: '2026-09-10T12:00:00.000Z',
    refreshing: false,
    total: 2,
    items: [
      {
        contractExternalId: 'ext-1',
        contractCode: '261467',
        customerName: 'Construtora Horizonte',
        customerDocument: '12.345.678/0001-90',
        customerPhone: '(51) 99999-0000',
        firstOverdueDate: '2026-08-10',
        firstOverdueAmount: '53.28',
        secondDueDate: '2026-09-10',
        secondDueAmount: '99.90',
        daysUntilSecond: 0,
        totalOpenAmount: '153.18',
      },
      {
        contractExternalId: 'ext-2',
        contractCode: '256552',
        customerName: 'Mercado Litoral',
        customerDocument: '98.765.432/0001-10',
        customerPhone: null,
        firstOverdueDate: '2026-08-21',
        firstOverdueAmount: '102.23',
        secondDueDate: '2026-09-14',
        secondDueAmount: '99.90',
        daysUntilSecond: 4,
        totalOpenAmount: '202.13',
      },
    ],
    ...overrides,
  };
}

function mockQuery(data: PreCollectionListResponse | undefined, extra = {}) {
  usePreCollection.mockReturnValue({
    data,
    isLoading: data === undefined,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    ...extra,
  });
}

describe('PreCollectionPage', () => {
  beforeEach(() => {
    usePreCollection.mockReset();
  });

  it('lista os clientes prestes a vencer a 2a', () => {
    mockQuery(buildData());
    renderWithProviders(<PreCollectionPage />);

    expect(screen.getByText('Construtora Horizonte')).toBeInTheDocument();
    expect(screen.getByText('Mercado Litoral')).toBeInTheDocument();
    expect(screen.getByText('vence hoje')).toBeInTheDocument();
    expect(screen.getByText(/2 clientes/)).toBeInTheDocument();
  });

  it('filtra pela busca por cliente', async () => {
    const user = userEvent.setup();
    mockQuery(buildData());
    renderWithProviders(<PreCollectionPage />);

    await user.type(
      screen.getByPlaceholderText('Buscar por cliente, documento ou contrato'),
      'Litoral',
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Construtora Horizonte'),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('Mercado Litoral')).toBeInTheDocument();
  });

  it('mostra estado de montagem quando o snapshot esta sendo atualizado', () => {
    mockQuery(buildData({ refreshing: true, total: 0, items: [] }));
    renderWithProviders(<PreCollectionPage />);

    expect(screen.getByText('Montando a lista…')).toBeInTheDocument();
  });

  it('mostra vazio quando nao ha clientes na janela', () => {
    mockQuery(buildData({ refreshing: false, total: 0, items: [] }));
    renderWithProviders(<PreCollectionPage />);

    expect(screen.getByText('Nenhum cliente nesta janela')).toBeInTheDocument();
  });
});
