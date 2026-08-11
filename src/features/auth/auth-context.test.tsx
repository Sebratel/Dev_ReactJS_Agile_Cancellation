import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTopbar } from '@/components/navigation/app-topbar';
import { authStorageKey } from '@/features/auth/auth.constants';
import { AuthProvider } from '@/features/auth/auth-provider';
import * as authService from '@/features/auth/auth.service';
import { RoleGuard } from '@/features/auth/guards/role-guard';
import { renderWithProviders } from '@/test/test-utils';
import { createMockSession } from '@/test/auth-test-utils';
import { TEST_STORED_TOKEN } from '@/test/test-credentials';

describe('Auth logout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('limpa sessao ao fazer logout', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'logoutWithApi').mockResolvedValue(undefined);

    renderWithProviders(
      <AppTopbar
        currentTitle="Visão geral"
        onOpenMobileMenu={() => undefined}
      />,
      {
        session: createMockSession(),
      },
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /encerrar sessão/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /encerrar sessão/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    });
  });
});

describe('AuthProvider bootstrap', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('faz bootstrap com /auth/me quando token existe', async () => {
    const stored = createMockSession({ accessToken: TEST_STORED_TOKEN });
    window.localStorage.setItem(authStorageKey, JSON.stringify(stored));

    vi.spyOn(authService, 'fetchCurrentUser');

    render(
      <AuthProvider>
        <div>Bootstrap</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(authService.fetchCurrentUser).toHaveBeenCalledWith(
        TEST_STORED_TOKEN,
      );
    });
  });
});

describe('RoleGuard roles reais', () => {
  it('permite acesso quando role real esta autorizada', async () => {
    const session = createMockSession({
      user: {
        id: 'user-cancellation',
        name: 'Rafael Costa',
        email: 'cancellation@ger.local',
        roles: ['CANCELLATION_AGENT'],
        role: 'CANCELLATION_AGENT',
      },
    });

    renderWithProviders(
      <Routes>
        <Route
          element={<RoleGuard allowedRoles={['CANCELLATION_AGENT', 'ADMIN']} />}
        >
          <Route path="/cancelamentos" element={<div>Cancelamentos</div>} />
        </Route>
      </Routes>,
      {
        route: '/cancelamentos',
        session,
      },
    );

    expect(await screen.findByText('Cancelamentos')).toBeInTheDocument();
  });
});
