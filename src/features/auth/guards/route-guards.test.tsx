import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProtectedRoute } from '@/features/auth/guards/protected-route';
import { RoleGuard } from '@/features/auth/guards/role-guard';
import { renderWithProviders } from '@/test/test-utils';
import { createMockSession } from '@/test/auth-test-utils';

describe('Route guards', () => {
  it('ProtectedRoute bloqueia usuario nao autenticado', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard privado</div>} />
        </Route>
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>,
      { route: '/dashboard', session: null },
    );

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });

  it('RoleGuard bloqueia perfil sem permissao', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
          <Route path="/usuarios" element={<div>Usuarios</div>} />
        </Route>
        <Route path="/acesso-negado" element={<div>Acesso negado</div>} />
      </Routes>,
      {
        route: '/usuarios',
        session: createMockSession({
          user: {
            id: 'viewer',
            name: 'Luciana Freitas',
            email: 'viewer@ger.local',
            roles: ['VIEWER'],
            role: 'VIEWER',
          },
        }),
      },
    );

    await waitFor(() => {
      expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    });
  });
});
