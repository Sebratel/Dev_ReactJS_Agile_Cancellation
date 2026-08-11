import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreatePaymentPromiseForm } from '@/features/collection-cases/components/create-payment-promise-form';
import type { useCreatePaymentPromise } from '@/features/collection-cases/hooks/use-create-payment-promise';
import { ApiError } from '@/services/api/api-error';
import { renderWithProviders } from '@/test/test-utils';

type UseCreatePaymentPromiseResult = ReturnType<typeof useCreatePaymentPromise>;

const mutateAsync = vi.fn();
const useCreatePaymentPromiseMock = vi.fn();

vi.mock('@/features/collection-cases/hooks/use-create-payment-promise', () => ({
  useCreatePaymentPromise: (...args: unknown[]) =>
    useCreatePaymentPromiseMock(
      ...args,
    ) as unknown as UseCreatePaymentPromiseResult,
}));

describe('CreatePaymentPromiseForm', () => {
  it('renderiza campos do formulario', () => {
    useCreatePaymentPromiseMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<CreatePaymentPromiseForm caseId="case_0001" />);

    expect(screen.getByLabelText('Valor prometido')).toBeInTheDocument();
    expect(screen.getByLabelText('Data prometida')).toBeInTheDocument();
    expect(screen.getByLabelText('Observação')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Salvar promessa' }),
    ).toBeInTheDocument();
  });

  it('valida campos obrigatorios', async () => {
    useCreatePaymentPromiseMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();

    renderWithProviders(<CreatePaymentPromiseForm caseId="case_0001" />);

    await user.click(screen.getByRole('button', { name: 'Salvar promessa' }));

    expect(
      await screen.findByText('Informe o valor prometido.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Informe a data prometida.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('valida valor menor ou igual a zero', async () => {
    useCreatePaymentPromiseMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();

    renderWithProviders(<CreatePaymentPromiseForm caseId="case_0001" />);

    await user.type(screen.getByLabelText('Valor prometido'), '0');
    await user.type(screen.getByLabelText('Data prometida'), '2026-07-15');
    await user.click(screen.getByRole('button', { name: 'Salvar promessa' }));

    expect(
      await screen.findByText('Informe um valor maior que zero.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('envia mutation com payload correto e limpa formulario no sucesso', async () => {
    mutateAsync.mockResolvedValue({
      id: 'prm_new',
      collectionCaseId: 'case_0001',
      status: 'ACTIVE',
      promisedAmount: '1500.00',
      promisedDate: '2026-07-15T00:00:00.000Z',
      notes: 'Acordo confirmado.',
      createdAt: new Date().toISOString(),
      createdByUserId: 'usr_marina',
    });

    useCreatePaymentPromiseMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();

    renderWithProviders(<CreatePaymentPromiseForm caseId="case_0001" />);

    await user.type(screen.getByLabelText('Valor prometido'), '1500');
    await user.type(screen.getByLabelText('Data prometida'), '2026-07-15');
    await user.type(screen.getByLabelText('Observação'), 'Acordo confirmado.');
    await user.click(screen.getByRole('button', { name: 'Salvar promessa' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promisedAmount: 1500,
          notes: 'Acordo confirmado.',
        }),
      );
    });

    const submittedPayload = mutateAsync.mock.calls[0]?.[0] as {
      promisedDate: string;
    };

    expect(submittedPayload.promisedDate).toMatch(/2026-07-15/);

    expect(
      await screen.findByText('Promessa registrada com sucesso.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Observação')).toHaveValue('');
  });

  it('mostra feedback de erro', () => {
    useCreatePaymentPromiseMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: true,
      error: new ApiError(400, { message: 'Valor inválido.' }),
    });

    renderWithProviders(<CreatePaymentPromiseForm caseId="case_0001" />);

    expect(screen.getByText('Falha ao registrar promessa')).toBeInTheDocument();
    expect(screen.getByText('Valor inválido.')).toBeInTheDocument();
  });
});
