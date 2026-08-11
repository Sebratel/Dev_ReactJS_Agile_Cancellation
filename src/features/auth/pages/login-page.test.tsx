import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/features/auth/pages/login-page';
import { authStorageKey } from '@/features/auth/auth.constants';
import * as authService from '@/features/auth/auth.service';
import { renderWithProviders } from '@/test/test-utils';
import { ApiError } from '@/services/api/api-error';
import { TEST_LOGIN_TOKEN, TEST_REFRESH_TOKEN } from '@/test/test-credentials';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renderiza corretamente', () => {
    renderWithProviders(<LoginPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Acessar plataforma' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Paulo Nogueira/ }),
    ).toBeInTheDocument();
  });

  it('autentica usuario com a conta mock selecionada', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'loginWithGoogle').mockResolvedValue({
      accessToken: TEST_LOGIN_TOKEN,
      refreshToken: TEST_REFRESH_TOKEN,
      user: {
        id: 'user-supervisor',
        name: 'Paulo Nogueira',
        email: 'supervisor@ger.local',
        roles: ['SUPERVISOR'],
        role: 'SUPERVISOR',
      },
    });

    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /Paulo Nogueira/ }));

    expect(authService.loginWithGoogle).toHaveBeenCalledWith(
      'mock:supervisor@ger.local',
    );

    await waitFor(() => {
      const storedSession = window.localStorage.getItem(authStorageKey);
      expect(storedSession).toContain('supervisor@ger.local');
      expect(storedSession).toContain(TEST_LOGIN_TOKEN);
      expect(storedSession).toContain(TEST_REFRESH_TOKEN);
    });
  });

  it('exibe feedback quando login falha', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'loginWithGoogle').mockRejectedValue(
      new ApiError(403, {
        message: 'Seu e-mail não está cadastrado na plataforma.',
      }),
    );

    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /Ana Martins/ }));

    expect(
      await screen.findByText('Seu e-mail não está cadastrado na plataforma.'),
    ).toBeInTheDocument();
  });
});
