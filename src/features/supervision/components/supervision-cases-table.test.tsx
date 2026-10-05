import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SupervisionCasesTable } from '@/features/supervision/components/supervision-cases-table';
import { type CollectionCaseListItemResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { type UserResponse } from '@/features/users/types/users-api.types';
import { createMockSession } from '@/test/auth-test-utils';
import { renderWithProviders } from '@/test/test-utils';

const mutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/collection-cases/hooks/use-assign-case', () => ({
  useAssignCase: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/features/users/hooks/use-users', () => ({
  useUsers: () => ({
    data: {
      items: [
        {
          id: 'user-collection',
          email: 'collection@ger.local',
          name: 'Marina Lopes',
          avatarUrl: null,
          status: 'ACTIVE',
          roles: ['COLLECTION_AGENT'],
          lastLoginAt: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
  }),
}));

const items: CollectionCaseListItemResponse[] = [
  {
    id: 'case_0001',
    customerName: 'Construtora Horizonte',
    customerPhone: '(51) 99911-2233',
    contractCode: 'CTR-10428',
    contractStatus: 'ACTIVE',
    contractErpStatus: 'Normal',
    firstOverdueDate: '2026-06-28T00:00:00.000Z',
    secondOverdueDate: '2026-07-28T00:00:00.000Z',
    status: 'IN_COLLECTION',
    priority: 'HIGH',
    daysOverdue: 45,
    outstandingAmount: '12890.55',
    totalAttempts: 1,
    assignedTo: null,
    slaDueAt: null,
    matrixAwaitingReply: false,
    matrixLastOutboundAt: null,
    matrixLastReplyAt: null,
  },
];

const defaultAgents: UserResponse[] = [
  {
    id: 'user-collection',
    email: 'collection@ger.local',
    name: 'Marina Lopes',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['COLLECTION_AGENT'],
    lastLoginAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

function renderTable(
  session = createMockSession(),
  overrides: { canDistribute?: boolean } = {},
) {
  const canDistribute = overrides.canDistribute ?? true;

  return renderWithProviders(
    <SupervisionCasesTable
      items={items}
      agents={defaultAgents}
      agentsLoading={false}
      canDistribute={canDistribute}
      page={1}
      totalPages={1}
      sortBy=""
      sortDirection="desc"
      onPageChange={vi.fn()}
      onSortChange={vi.fn()}
      selectedIds={new Set()}
      onToggleSelect={vi.fn()}
      onToggleSelectAll={vi.fn()}
    />,
    { session },
  );
}

describe('SupervisionCasesTable', () => {
  it('mostra o seletor de responsavel para ADMIN/SUPERVISOR e atribui ao trocar', async () => {
    const user = userEvent.setup();

    renderTable();

    const trigger = await screen.findByRole('button', {
      name: 'Responsavel pelo caso case_0001',
    });
    await user.click(trigger);
    await user.click(
      await screen.findByRole('option', { name: /Marina Lopes/ }),
    );

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        assignedUserId: 'user-collection',
      });
    });
  });

  it('mostra apenas texto para quem nao pode distribuir', async () => {
    renderTable(
      createMockSession({
        user: {
          id: 'session-user',
          name: 'Colaborador',
          email: 'agent@ger.local',
          roles: ['COLLECTION_AGENT'],
          role: 'COLLECTION_AGENT',
        },
      }),
      { canDistribute: false },
    );

    expect(await screen.findByText(/atribu/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Responsavel pelo caso case_0001',
      }),
    ).not.toBeInTheDocument();
  });

  it('renderiza como cards quando o container disponivel e estreito (sem tabela)', async () => {
    // O layout e escolhido pela largura REAL do container (ResizeObserver +
    // getBoundingClientRect), nao pelo viewport. Forcamos um container estreito
    // (< 1100px) para exercitar o caminho de cards.
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        width: 700,
        height: 600,
        top: 0,
        left: 0,
        right: 700,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);

    try {
      renderTable();

      // No layout de card os campos aparecem rotulados e nao ha tabela.
      expect(
        await screen.findByText('Construtora Horizonte'),
      ).toBeInTheDocument();
      expect(screen.getByText('Vencimentos')).toBeInTheDocument();
      expect(screen.getByText('Responsável')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    } finally {
      rectSpy.mockRestore();
    }
  });
});
