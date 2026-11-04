import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ForbiddenPage from '@/features/auth/pages/forbidden-page';
import { renderWithProviders } from '@/test/test-utils';

describe('ForbiddenPage', () => {
  it('explica o acesso negado e volta ao dashboard ao clicar', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/dashboard" element={<p>pagina do dashboard</p>} />
      </Routes>,
      { route: '/forbidden' },
    );

    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(screen.getByText('Permissão insuficiente')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Voltar ao dashboard' }),
    );

    expect(await screen.findByText('pagina do dashboard')).toBeInTheDocument();
  });
});
