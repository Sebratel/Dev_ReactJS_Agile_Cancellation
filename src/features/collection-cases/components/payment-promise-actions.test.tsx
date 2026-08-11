import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaymentPromiseActions } from '@/features/collection-cases/components/payment-promise-actions';
import { ApiError } from '@/services/api/api-error';
import { createQueryWrapper } from '@/test/query-test-utils';

const fulfillMutateAsync = vi.fn();
const breakMutateAsync = vi.fn();
const cancelMutateAsync = vi.fn();

vi.mock(
  '@/features/collection-cases/hooks/use-fulfill-payment-promise',
  () => ({
    useFulfillPaymentPromise: () => ({
      mutateAsync: fulfillMutateAsync,
      isPending: false,
    }),
  }),
);

vi.mock('@/features/collection-cases/hooks/use-break-payment-promise', () => ({
  useBreakPaymentPromise: () => ({
    mutateAsync: breakMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/features/collection-cases/hooks/use-cancel-payment-promise', () => ({
  useCancelPaymentPromise: () => ({
    mutateAsync: cancelMutateAsync,
    isPending: false,
  }),
}));

function renderActions() {
  const wrapper = createQueryWrapper();

  return render(
    <PaymentPromiseActions caseId="case_0001" promiseId="prm_0001" />,
    {
      wrapper,
    },
  );
}

describe('PaymentPromiseActions', () => {
  it('mostra acoes para promessa ACTIVE', () => {
    renderActions();

    expect(
      screen.getByRole('button', { name: 'Marcar como cumprida' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Marcar como descumprida' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar promessa' }),
    ).toBeInTheDocument();
  });

  it('abre ConfirmDialog ao marcar como cumprida e confirma mutation', async () => {
    const user = userEvent.setup();
    fulfillMutateAsync.mockResolvedValue({
      id: 'prm_0001',
      status: 'FULFILLED',
    });

    renderActions();

    await user.click(
      screen.getByRole('button', { name: 'Marcar como cumprida' }),
    );

    expect(
      screen.getByText('Marcar promessa como cumprida'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Confirmar cumprimento' }),
    );

    await waitFor(() => {
      expect(fulfillMutateAsync).toHaveBeenCalledWith({
        promiseId: 'prm_0001',
      });
    });

    expect(
      await screen.findByText('Promessa marcada como cumprida.'),
    ).toBeInTheDocument();
  });

  it('mostra feedback de erro quando mutation falha', async () => {
    const user = userEvent.setup();
    breakMutateAsync.mockRejectedValue(
      new ApiError(409, { message: 'Transicao invalida.' }),
    );

    renderActions();

    await user.click(
      screen.getByRole('button', { name: 'Marcar como descumprida' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar descumprimento' }),
    );

    expect(
      await screen.findByText('Falha ao atualizar promessa'),
    ).toBeInTheDocument();
    expect(screen.getByText('Transicao invalida.')).toBeInTheDocument();
  });
});
