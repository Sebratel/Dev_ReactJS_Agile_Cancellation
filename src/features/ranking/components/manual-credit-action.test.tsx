import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualCreditAction } from '@/features/ranking/components/manual-credit-action';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/features/ranking/services/manual-credit.service', () => ({
  creditCaseManually: vi.fn(),
}));

vi.mock('@/features/users/services/users.service', () => ({
  getUsers: vi.fn(),
  getUsersWorkload: vi.fn(),
}));

import { creditCaseManually } from '@/features/ranking/services/manual-credit.service';
import { getUsers } from '@/features/users/services/users.service';

describe('ManualCreditAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(creditCaseManually).mockResolvedValue({
      credited: true,
      amount: '99.90',
    });
  });

  it('exige atendente e motivo antes de creditar e envia os dois', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ManualCreditAction caseId="c1" customerName="ACME LTDA" />,
    );

    await user.click(
      screen.getByRole('button', { name: /Creditar a um atendente/ }),
    );

    const confirm = await screen.findByRole('button', {
      name: 'Creditar receita',
    });
    expect(confirm).toBeDisabled();

    await user.selectOptions(
      await screen.findByLabelText('Atendente que recebe o crédito'),
      'usr_deb',
    );
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText('Motivo do crédito'), 'curto');
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText('Motivo do crédito'),
      ' fechou por ligação',
    );
    expect(confirm).toBeEnabled();

    await user.click(confirm);

    await waitFor(() => {
      expect(creditCaseManually).toHaveBeenCalledWith('c1', {
        assignedUserId: 'usr_deb',
        reason: 'curto fechou por ligação',
      });
    });
  });
});
