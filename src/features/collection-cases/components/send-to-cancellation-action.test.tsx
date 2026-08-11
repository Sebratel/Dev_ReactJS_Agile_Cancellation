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

  it('exige motivo antes de confirmar', async () => {
    const user = userEvent.setup();
    renderAction();

    await user.click(
      screen.getByRole('button', { name: 'Encaminhar para cancelamento' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar encaminhamento' }),
    );

    expect(
      screen.getByText('Informe o motivo do encaminhamento.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('confirma mutation com motivo valido', async () => {
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
    await user.type(screen.getByLabelText('Motivo'), 'Cliente recusou acordo.');
    await user.click(
      screen.getByRole('button', { name: 'Confirmar encaminhamento' }),
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      reason: 'Cliente recusou acordo.',
      notes: undefined,
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
    await user.type(screen.getByLabelText('Motivo'), 'Motivo valido.');
    await user.click(
      screen.getByRole('button', { name: 'Confirmar encaminhamento' }),
    );

    expect(
      await screen.findByText('Falha ao encaminhar caso'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Caso ja possui cancelamento.'),
    ).toBeInTheDocument();
  });
});
