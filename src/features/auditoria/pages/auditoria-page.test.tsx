import { Route, Routes, useLocation } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditoriaPage from '@/features/auditoria/pages/auditoria-page';
import { createMockSession } from '@/test/auth-test-utils';
import { createMockAuditLogsPage } from '@/test/fixtures/api-fixtures';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/features/auditoria/services/auditoria.service', () => ({
  getAuditLogs: vi.fn(),
  buildAuditLogsPath: vi.fn(),
}));

import { getAuditLogs } from '@/features/auditoria/services/auditoria.service';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderAuditoria(initialRoute = '/auditoria') {
  renderWithProviders(
    <Routes>
      <Route
        path="/auditoria"
        element={
          <>
            <AuditoriaPage />
            <LocationDisplay />
          </>
        }
      />
    </Routes>,
    {
      route: initialRoute,
      session: createMockSession({
        user: {
          id: 'admin',
          name: 'Admin SEBRATEL',
          email: 'admin@ger.local',
          roles: ['ADMIN'],
          role: 'ADMIN',
        },
      }),
    },
  );
}

describe('AuditoriaPage', () => {
  beforeEach(() => {
    vi.mocked(getAuditLogs).mockResolvedValue(createMockAuditLogsPage(1, 20));
  });

  it('renderiza pagina e tabela', async () => {
    renderAuditoria();

    expect(await screen.findByText('Auditoria')).toBeInTheDocument();
    expect(
      await screen.findByText('Tentativa de cobrança registrada'),
    ).toBeInTheDocument();
    expect(screen.getByText('Registros de auditoria')).toBeInTheDocument();
  });

  it('le filtros da URL', async () => {
    renderAuditoria('/auditoria?action=CREATE&search=case_0001');

    await screen.findByText('Registros de auditoria');

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          search: 'case_0001',
        }),
      );
    });
  });

  it('alterar busca atualiza URL', async () => {
    const user = userEvent.setup();
    renderAuditoria('/auditoria');

    await screen.findByText('Registros de auditoria');

    await user.type(
      screen.getByPlaceholderText('Entidade, ação, usuário...'),
      'admin',
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('location-search')).toHaveTextContent(
          'search=admin',
        );
      },
      { timeout: 2000 },
    );
  });

  it('limpar filtros remove URL params', async () => {
    const user = userEvent.setup();
    renderAuditoria('/auditoria?action=CREATE&search=case');

    await screen.findByText('Registros de auditoria');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('');
    });
  });

  it('renderiza empty state', async () => {
    vi.mocked(getAuditLogs).mockResolvedValue(
      createMockAuditLogsPage(1, 20, 0),
    );
    renderAuditoria();

    expect(
      await screen.findByText('Nenhum registro encontrado'),
    ).toBeInTheDocument();
  });

  it('renderiza error state', async () => {
    vi.mocked(getAuditLogs).mockRejectedValue(new Error('fail'));
    renderAuditoria();

    expect(
      await screen.findByText('Não foi possível carregar a auditoria'),
    ).toBeInTheDocument();
  });

  it('dialog de detalhes renderiza metadata', async () => {
    const user = userEvent.setup();
    renderAuditoria();

    await screen.findByText('Tentativa de cobrança registrada');
    await user.click(
      screen.getByRole('button', {
        name: 'Ver detalhes de Tentativa de cobrança registrada',
      }),
    );

    expect(
      await screen.findByText('Detalhes da auditoria'),
    ).toBeInTheDocument();
    expect(screen.getByText(/"attemptId": "att_1"/)).toBeInTheDocument();
  });
});
