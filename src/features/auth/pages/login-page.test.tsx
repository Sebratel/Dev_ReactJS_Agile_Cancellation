import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/features/auth/pages/login-page';
import { renderWithProviders } from '@/test/test-utils';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renderiza a tela de acesso corporativo', () => {
    renderWithProviders(<LoginPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Acessar plataforma' }),
    ).toBeInTheDocument();
    expect(screen.getByText('@sebratel.com.br')).toBeInTheDocument();
  });

  it('nao exibe contas ficticias quando Google nao esta configurado', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.queryByText('Paulo Nogueira')).not.toBeInTheDocument();
    expect(screen.queryByText('collection@ger.local')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Login Google nao configurado/i),
    ).toBeInTheDocument();
  });
});
