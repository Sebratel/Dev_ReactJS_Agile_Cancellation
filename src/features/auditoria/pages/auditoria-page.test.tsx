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
    expect(await screen.findByText('ACME LTDA')).toBeInTheDocument();
    expect(
      screen.getByText(/registrou uma tentativa de contato com/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Contrato 238580 · WhatsApp · sem resposta'),
    ).toBeInTheDocument();
    expect(screen.getByText('Registros de auditoria')).toBeInTheDocument();
  });

  it('mostra acessos e acesso recusado com o e-mail de quem tentou', async () => {
    const [first] = createMockAuditLogsPage(1, 20).items;

    if (!first) {
      throw new Error('fixture vazia');
    }

    vi.mocked(getAuditLogs).mockResolvedValue({
      items: [
        {
          ...first,
          id: 'audit_login',
          actor: null,
          actorLabel: 'x@fora.com',
          entityType: 'AUTH',
          entityId: 'x@fora.com',
          action: 'LOGIN',
          summary: 'Login realizado',
          category: 'ACCESS',
          verb: 'teve o acesso recusado',
          detail: 'E-mail n\u00e3o cadastrado na plataforma \u00b7 x@fora.com',
          subject: null,
        },
        {
          ...first,
          id: 'audit_export',
          category: 'EXPORT',
          verb: 'exportou 120 casos em CSV',
          detail: 'status: CLOSED',
          subject: null,
          action: 'EXPORT',
          summary: 'Exportacao realizada',
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    renderAuditoria();

    expect(await screen.findByText('x@fora.com')).toBeInTheDocument();
    expect(screen.getByText(/teve o acesso recusado/)).toBeInTheDocument();
    expect(screen.getByText(/exportou 120 casos em CSV/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acessos' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Exporta\u00e7\u00f5es' }),
    ).toBeInTheDocument();
  });

  it('mostra acoes administrativas e envios em massa sem precisar de cliente', async () => {
    const [first] = createMockAuditLogsPage(1, 20).items;

    if (!first) {
      throw new Error('fixture vazia');
    }

    vi.mocked(getAuditLogs).mockResolvedValue({
      items: [
        {
          ...first,
          id: 'audit_user',
          entityType: 'USER',
          entityId: 'u2',
          action: 'UPDATE',
          summary: 'Registro atualizado',
          category: 'ADMIN',
          verb: 'alterou o usu\u00e1rio Ana',
          detail: 'Status: Ativo \u2192 Inativo',
          subject: null,
        },
        {
          ...first,
          id: 'audit_bulk',
          entityType: 'BULK_CONTACT_JOB',
          entityId: 'job1',
          action: 'CREATE',
          summary: 'Registro criado',
          category: 'MESSAGE',
          verb: 'disparou um envio de HSM em massa para 120 casos',
          detail: 'Sele\u00e7\u00e3o manual',
          subject: null,
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    renderAuditoria();

    expect(
      await screen.findByText(/alterou o usu\u00e1rio Ana/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/disparou um envio de HSM em massa para 120 casos/),
    ).toBeInTheDocument();
    for (const label of [
      'Notas',
      'Administra\u00e7\u00e3o',
      'Envios em massa',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
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
      screen.getByPlaceholderText('Buscar por nome do cliente ou contrato'),
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

    await screen.findByText('ACME LTDA');
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
