import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CancelledClientsPage from '@/features/cancelled-clients/pages/cancelled-clients-page';
import { type CollectionCaseListItemResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { createMockSession } from '@/test/auth-test-utils';
import { createMockCollectionCasesPage } from '@/test/fixtures/api-fixtures';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCases: vi.fn(),
    reopenCancelledCases: vi.fn(),
  }),
);

vi.mock('@/features/dashboard/services/dashboard.service', () => ({
  getCancellationReasons: vi.fn(),
}));

vi.mock('@/features/users/services/users.service', () => ({
  getUsers: vi.fn(),
  getUsersWorkload: vi.fn(),
}));

import {
  getCollectionCases,
  reopenCancelledCases,
} from '@/features/collection-cases/services/collection-cases.service';
import { getCancellationReasons } from '@/features/dashboard/services/dashboard.service';
import {
  getUsers,
  getUsersWorkload,
} from '@/features/users/services/users.service';

function closedCase(
  overrides: Partial<CollectionCaseListItemResponse>,
): CollectionCaseListItemResponse {
  const [template] = createMockCollectionCasesPage(1, 1, 1).items;

  if (!template) {
    throw new Error('fixture vazia');
  }

  return { ...template, ...overrides };
}

const items = [
  closedCase({
    id: 'c1',
    customerName: 'ACME LTDA',
    status: 'CLOSED',
    totalAttempts: 3,
  }),
  closedCase({
    id: 'c2',
    customerName: 'BETA SA',
    status: 'CANCELLED_IN_RECOVERY',
    assignedTo: { id: 'usr_deb', name: 'Débora', avatarUrl: null },
  }),
];

describe('CancelledClientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCollectionCases).mockResolvedValue({
      items,
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });
    vi.mocked(getUsers).mockResolvedValue({
      items: [
        {
          id: 'usr_deb',
          name: 'Débora',
          email: 'd@x.test',
          status: 'ACTIVE',
          roles: ['COLLECTION_AGENT'],
          avatarUrl: null,
          lastLoginAt: null,
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    } as never);
    vi.mocked(getUsersWorkload).mockResolvedValue({});
    vi.mocked(getCancellationReasons).mockResolvedValue({
      totalClosed: 10,
      withReason: 9,
      byCategory: [],
      topReasons: [],
      allReasons: [
        { reason: 'Inadimplência', category: 'INADIMPLENCIA', count: 7 },
        { reason: 'Mudança de Endereço', category: 'EXTERNO', count: 3 },
      ],
      excludedNotCancelled: 0,
    });
  });

  it('nao oferece mais o botao Recuperado e mostra a situacao de cada caso', async () => {
    renderWithProviders(<CancelledClientsPage />, {
      session: createMockSession(),
    });

    expect(await screen.findByText('ACME LTDA')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recuperado' })).toBeNull();
    expect(screen.getByText('Cancelado em recuperação')).toBeInTheDocument();
  });

  it('supervisao seleciona encerrados e devolve a carteira de um atendente', async () => {
    vi.mocked(reopenCancelledCases).mockResolvedValue({
      reopened: 1,
      skipped: 0,
    });
    const user = userEvent.setup();

    renderWithProviders(<CancelledClientsPage />, {
      session: createMockSession(),
    });

    await screen.findByText('ACME LTDA');

    // Quem já está em carteira não pode ser selecionado de novo.
    expect(
      screen.getByRole('checkbox', { name: 'Selecionar BETA SA' }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar ACME LTDA' }),
    );
    expect(
      screen.getByText('cliente cancelado selecionado'),
    ).toBeInTheDocument();

    const confirm = screen.getByRole('button', {
      name: 'Devolver à carteira',
    });
    expect(confirm).toBeDisabled();

    // Escolhe o atendente no seletor da barra.
    await user.click(
      screen.getByRole('button', { name: 'Selecionar responsável' }),
    );
    await user.click(
      within(screen.getByRole('listbox')).getByRole('option', {
        name: /Débora/,
      }),
    );
    await user.click(confirm);

    await waitFor(() => {
      expect(reopenCancelledCases).toHaveBeenCalledWith({
        caseIds: ['c1'],
        assignedUserId: 'usr_deb',
      });
    });
  });

  it('filtra os cancelados pelo motivo do cancelamento', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CancelledClientsPage />, {
      session: createMockSession(),
    });

    await screen.findByText('ACME LTDA');
    await user.selectOptions(
      await screen.findByLabelText('Motivo do cancelamento'),
      'Mudança de Endereço',
    );

    await waitFor(() => {
      expect(getCollectionCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cancellationReason: 'Mudança de Endereço',
          contractStatus: 'CANCELLED',
        }),
      );
    });
  });

  it('atendente nao ve selecao nem a barra de devolucao', async () => {
    renderWithProviders(<CancelledClientsPage />, {
      session: createMockSession({
        user: {
          id: 'usr_deb',
          name: 'Débora',
          email: 'd@x.test',
          roles: ['COLLECTION_AGENT'],
          role: 'COLLECTION_AGENT',
        },
      }),
    });

    expect(await screen.findByText('ACME LTDA')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
