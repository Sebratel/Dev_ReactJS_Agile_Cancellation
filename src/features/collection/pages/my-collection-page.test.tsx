import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MyCollectionPage from '@/features/collection/pages/my-collection-page';
import { createMockSession } from '@/test/auth-test-utils';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCases: vi.fn(),
    getCollectionCaseById: vi.fn(),
  }),
);

import { getCollectionCases } from '@/features/collection-cases/services/collection-cases.service';

const page = {
  items: [
    {
      id: 'case_0001',
      customerName: 'Construtora Horizonte',
      contractCode: 'CTR-10428',
      status: 'IN_COLLECTION',
      priority: 'HIGH',
      daysOverdue: 45,
      outstandingAmount: '12890.55',
      assignedTo: { id: 'usr_marina', name: 'Marina Lopes' },
      slaDueAt: null,
    },
  ],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

describe('MyCollectionPage', () => {
  it('lista os casos atribuidos ao usuario logado', async () => {
    vi.mocked(getCollectionCases).mockResolvedValue(page);

    renderWithProviders(<MyCollectionPage />, {
      route: '/minha-cobranca',
      session: createMockSession(),
    });

    expect(
      (await screen.findAllByText('Construtora Horizonte')).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('CTR-10428')).toBeInTheDocument();
  });

  it('filtra pela id do usuario da sessao', async () => {
    vi.mocked(getCollectionCases).mockResolvedValue(page);

    const session = createMockSession();

    renderWithProviders(<MyCollectionPage />, {
      route: '/minha-cobranca',
      session,
    });

    await waitFor(() => {
      expect(getCollectionCases).toHaveBeenCalledWith(
        expect.objectContaining({ assignedToId: session.user.id }),
      );
    });
  });

  it('mostra empty state quando nao ha casos', async () => {
    vi.mocked(getCollectionCases).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderWithProviders(<MyCollectionPage />, {
      route: '/minha-cobranca',
      session: createMockSession(),
    });

    await waitFor(() => {
      expect(screen.getByText('Nenhum caso atribuído')).toBeInTheDocument();
    });
  });
});
