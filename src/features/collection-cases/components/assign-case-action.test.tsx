import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssignCaseAction } from '@/features/collection-cases/components/assign-case-action';
import { renderWithProviders } from '@/test/test-utils';
import { createMockSession } from '@/test/auth-test-utils';

const mutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/collection-cases/hooks/use-assign-case', () => ({
  useAssignCase: () => ({
    mutateAsync,
    isPending: false,
    isError: false,
    error: null,
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

describe('AssignCaseAction', () => {
  it('atribui o caso ao colaborador selecionado', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <AssignCaseAction caseId="case_0001" currentAssigneeId={null} />,
      { session: createMockSession() },
    );

    await user.selectOptions(
      screen.getByLabelText('Responsável pelo caso'),
      'user-collection',
    );
    await user.click(
      screen.getByRole('button', { name: /Salvar responsável/i }),
    );

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        assignedUserId: 'user-collection',
      });
    });
  });

  it('mantem o botao desabilitado quando nao ha mudanca', () => {
    renderWithProviders(
      <AssignCaseAction
        caseId="case_0001"
        currentAssigneeId="user-collection"
      />,
      { session: createMockSession() },
    );

    expect(
      screen.getByRole('button', { name: /Salvar responsável/i }),
    ).toBeDisabled();
  });
});
