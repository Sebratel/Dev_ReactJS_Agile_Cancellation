import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/app-layout';
import { createMockSession } from '@/test/auth-test-utils';
import { renderWithProviders } from '@/test/test-utils';

describe('AppLayout', () => {
  it('renderiza sidebar, topbar e conteudo', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<div>Conteudo principal</div>} />
        </Route>
      </Routes>,
      { route: '/dashboard', session: createMockSession() },
    );

    expect(screen.getByLabelText('Sidebar')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Trilha de navegação' }),
    ).toHaveTextContent('Visão geral');
    expect(screen.getByText('Conteudo principal')).toBeInTheDocument();
  });

  it('mostra titulo do detalhe do caso na topbar', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/supervisao/:caseId"
            element={<div>Detalhe renderizado</div>}
          />
        </Route>
      </Routes>,
      { route: '/supervisao/case_0001', session: createMockSession() },
    );

    expect(
      screen.getByRole('navigation', { name: 'Trilha de navegação' }),
    ).toHaveTextContent('Detalhe do caso');
    expect(screen.getByText('Detalhe renderizado')).toBeInTheDocument();
  });
});
