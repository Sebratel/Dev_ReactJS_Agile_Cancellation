import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateCollectionAttemptForm } from '@/features/collection-cases/components/create-collection-attempt-form';
import type { useCreateCollectionAttempt } from '@/features/collection-cases/hooks/use-create-collection-attempt';
import { ApiError } from '@/services/api/api-error';
import { renderWithProviders } from '@/test/test-utils';

type UseCreateCollectionAttemptResult = ReturnType<
  typeof useCreateCollectionAttempt
>;

const mutateAsync = vi.fn();
const useCreateCollectionAttemptMock = vi.fn();

vi.mock(
  '@/features/collection-cases/hooks/use-create-collection-attempt',
  () => ({
    useCreateCollectionAttempt: (...args: unknown[]) =>
      useCreateCollectionAttemptMock(
        ...args,
      ) as unknown as UseCreateCollectionAttemptResult,
  }),
);

describe('CreateCollectionAttemptForm', () => {
  it('renderiza campos do formulario', () => {
    useCreateCollectionAttemptMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<CreateCollectionAttemptForm caseId="case_0001" />);

    expect(screen.getByLabelText('Canal')).toBeInTheDocument();
    expect(screen.getByLabelText('Resultado')).toBeInTheDocument();
    expect(screen.getByLabelText('Observação')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Próximo contato (opcional)'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Salvar tentativa' }),
    ).toBeInTheDocument();
  });

  it('valida campos obrigatorios', async () => {
    useCreateCollectionAttemptMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();

    renderWithProviders(<CreateCollectionAttemptForm caseId="case_0001" />);

    await user.click(screen.getByRole('button', { name: 'Salvar tentativa' }));

    expect(await screen.findByText('Selecione o canal.')).toBeInTheDocument();
    expect(screen.getByText('Selecione o resultado.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('envia mutation com payload correto e limpa formulario no sucesso', async () => {
    mutateAsync.mockResolvedValue({
      id: 'att_new',
      collectionCaseId: 'case_0001',
      channel: 'WHATSAPP',
      result: 'CONTACTED',
      attemptedAt: new Date().toISOString(),
      notes: 'Cliente respondeu.',
      nextContactAt: null,
      performedByUserId: 'usr_marina',
    });

    useCreateCollectionAttemptMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();

    renderWithProviders(<CreateCollectionAttemptForm caseId="case_0001" />);

    await user.selectOptions(screen.getByLabelText('Canal'), 'WHATSAPP');
    await user.selectOptions(screen.getByLabelText('Resultado'), 'CONTACTED');
    await user.type(screen.getByLabelText('Observação'), 'Cliente respondeu.');
    await user.click(screen.getByRole('button', { name: 'Salvar tentativa' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        channel: 'WHATSAPP',
        result: 'CONTACTED',
        notes: 'Cliente respondeu.',
        nextContactAt: undefined,
      });
    });

    expect(
      await screen.findByText('Tentativa registrada com sucesso.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Observação')).toHaveValue('');
  });

  it('mostra feedback de erro', () => {
    useCreateCollectionAttemptMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: true,
      error: new ApiError(400, { message: 'Canal inválido.' }),
    });

    renderWithProviders(<CreateCollectionAttemptForm caseId="case_0001" />);

    expect(
      screen.getByText('Falha ao registrar tentativa'),
    ).toBeInTheDocument();
    expect(screen.getByText('Canal inválido.')).toBeInTheDocument();
  });
});
