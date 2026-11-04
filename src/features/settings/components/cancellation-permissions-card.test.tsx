import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancellationPermissionsCard } from '@/features/settings/components/cancellation-permissions-card';
import { ApiError } from '@/services/api/api-error';
import { renderWithProviders } from '@/test/test-utils';

const useSettings = vi.fn();
const mutateAsync = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/features/settings/hooks/use-settings', () => ({
  useSettings: (): unknown => useSettings(),
}));
vi.mock('@/features/settings/hooks/use-update-settings', () => ({
  useUpdateSettings: (): unknown => ({ mutateAsync, isPending: false }),
}));
vi.mock('@/lib/toast', () => ({
  toast: {
    success: (message: string): void => {
      toastSuccess(message);
    },
    error: (message: string): void => {
      toastError(message);
    },
  },
}));

function mockSettings(allow: boolean | undefined, isLoading = false) {
  useSettings.mockReturnValue({
    data:
      allow === undefined ? undefined : { allowAgentSendToCancellation: allow },
    isLoading,
  });
}

describe('CancellationPermissionsCard', () => {
  beforeEach(() => {
    useSettings.mockReset();
    mutateAsync.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('reflete o estado desligado quando nao ha configuracao carregada', () => {
    mockSettings(undefined);
    renderWithProviders(<CancellationPermissionsCard />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('desabilita a chave enquanto carrega', () => {
    mockSettings(undefined, true);
    renderWithProviders(<CancellationPermissionsCard />);

    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('liga a permissao e avisa o sucesso', async () => {
    const user = userEvent.setup();
    mockSettings(false);
    mutateAsync.mockResolvedValue({});
    renderWithProviders(<CancellationPermissionsCard />);

    await user.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        allowAgentSendToCancellation: true,
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith(
      'Atendentes liberados para encaminhar ao cancelamento.',
    );
  });

  it('desliga a permissao quando estava ligada', async () => {
    const user = userEvent.setup();
    mockSettings(true);
    mutateAsync.mockResolvedValue({});
    renderWithProviders(<CancellationPermissionsCard />);

    await user.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        allowAgentSendToCancellation: false,
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith(
      'Envio ao cancelamento restrito a supervisão e administração.',
    );
  });

  it('mostra a mensagem do ApiError quando a atualizacao falha', async () => {
    const user = userEvent.setup();
    mockSettings(false);
    mutateAsync.mockRejectedValue(
      new ApiError(403, { message: 'Sem permissao' }),
    );
    renderWithProviders(<CancellationPermissionsCard />);

    await user.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Sem permissao');
    });
  });

  it('usa mensagem generica para erros desconhecidos', async () => {
    const user = userEvent.setup();
    mockSettings(false);
    mutateAsync.mockRejectedValue(new Error('boom'));
    renderWithProviders(<CancellationPermissionsCard />);

    await user.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Não foi possível atualizar a permissão.',
      );
    });
  });
});
