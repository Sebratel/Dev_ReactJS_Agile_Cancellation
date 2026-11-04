import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SendToCancellationAction } from '@/features/collection-cases/components/send-to-cancellation-action';
import { ApiError } from '@/services/api/api-error';
import { createQueryWrapper } from '@/test/query-test-utils';

const mutateAsync = vi.fn();

vi.mock(
  '@/features/collection-cases/hooks/use-send-case-to-cancellation',
  () => ({
    useSendCaseToCancellation: () => ({
      mutateAsync,
      isPending: false,
    }),
  }),
);

vi.mock('@/features/cancellations/hooks/use-cancellation-agents', () => ({
  useCancellationAgents: () => ({
    data: {
      items: [{ id: 'user-cancellation', name: 'Rafael Costa' }],
    },
    isLoading: false,
  }),
}));

async function selectAgent(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(
    screen.getByLabelText('Atendente do cancelamento'),
    'user-cancellation',
  );
}

function renderAction() {
  const wrapper = createQueryWrapper();

  return render(<SendToCancellationAction caseId="case_0001" />, { wrapper });
}

describe('SendToCancellationAction', () => {
  it('mostra botao para caso elegivel', () => {
    renderAction();

    expect(
      screen.getByRole('button', { name: 'Encaminhar para cancelamento' }),
    ).toBeInTheDocument();
  });

  it('exige atendente antes de confirmar', async () => {
    const user = userEvent.setup();
    renderAction();

    await user.click(
      screen.getByRole('button', { name: 'Encaminhar para cancelamento' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar encaminhamento' }),
    );

    expect(
      screen.getByText('Selecione o atendente do cancelamento.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('exige motivo apos escolher o atendente', async () => {
    const user = userEvent.setup();
    renderAction();

    await user.click(
      screen.getByRole('button', { name: 'Encaminhar para cancelamento' }),
    );
    await selectAgent(user);
    await user.click(
      screen.getByRole('button', { name: 'Confirmar encaminhamento' }),
    );

    expect(
      screen.getByText('Informe o motivo do encaminhamento.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('confirma mutation com atendente e motivo validos', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValue({
      id: 'can_0001',
      collectionCaseId: 'case_0001',
      status: 'PENDING',
    });

    renderAction();

    await user.click(
      screen.getByRole('button', { name: 'Encaminhar para cancelamento' }),
    );
    await selectAgent(user);
    await user.type(screen.getByLabelText('Motivo'), 'Cliente recusou acordo.');
    await user.click(
      screen.getByRole('button', { name: 'Confirmar encaminhamento' }),
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      reason: 'Cliente recusou acordo.',
      notes: undefined,
      assignedUserId: 'user-cancellation',
    });
    expect(
      await screen.findByText('Caso encaminhado para cancelamento.'),
    ).toBeInTheDocument();
  });

  it('mostra feedback de erro quando mutation falha', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(
      new ApiError(409, { message: 'Caso ja possui cancelamento.' }),
    );

    renderAction();

    await user.click(
      screen.getByRole('button', { name: 'Encaminhar para cancelamento' }),
    );
    await selectAgent(user);
    await user.type(screen.getByLabelText('Motivo'), 'Motivo valido.');
    await user.click(
      screen.getByRole('button', { name: 'Confirmar encaminhamento' }),
    );

    expect(await screen.findByText('Falha ao encaminhar')).toBeInTheDocument();
    expect(
      screen.getByText('Caso ja possui cancelamento.'),
    ).toBeInTheDocument();
  });
});
