import { Route, Routes, useLocation } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import SupervisionPage from '@/features/supervision/pages/supervision-page';
import { createMockSession } from '@/test/auth-test-utils';
import { createMockCollectionCasesPage } from '@/test/fixtures/api-fixtures';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCases: vi.fn(),
    getCollectionCaseById: vi.fn(),
    getCollectionCasePortfolios: vi.fn().mockResolvedValue({ portfolios: [] }),
    getCollectionCasesStatusSummary: vi
      .fn()
      .mockResolvedValue({ byStatus: {} }),
    getRenegotiatedHistory: vi.fn().mockResolvedValue({
      items: [],
      summary: {
        totalCases: 0,
        totalRenegotiations: 0,
        currentlyRenegotiated: 0,
        totalOutstanding: '0.00',
      },
    }),
    bulkAssignCases: vi.fn().mockResolvedValue({ assigned: 0, skipped: 0 }),
    autoDistribute: vi.fn().mockResolvedValue({ distributed: 0, agents: 0 }),
  }),
);

vi.mock('@/features/users/hooks/use-users', () => ({
  useUsers: () => ({
    data: { items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/features/users/hooks/use-users-workload', () => ({
  useUsersWorkload: () => ({
    data: {},
    isLoading: false,
    isError: false,
  }),
}));

// O banner de saude da sincronizacao dispara sua propria query; mockamos para
// nao fazer request real nem introduzir flakiness entre os testes da pagina.
vi.mock('@/features/integrations/hooks/use-integration-events', () => ({
  useSyncHealth: () => ({ isLoading: true, isError: false, data: undefined }),
}));

import { getCollectionCases } from '@/features/collection-cases/services/collection-cases.service';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

async function renderSupervision(initialRoute = '/supervisao') {
  renderWithProviders(
    <Routes>
      <Route
        path="/supervisao"
        element={
          <>
            <SupervisionPage />
            <LocationDisplay />
          </>
        }
      />
    </Routes>,
    {
      route: initialRoute,
      session: createMockSession({
        user: {
          id: 'supervisor',
          name: 'Supervisor SEBRATEL',
          email: 'supervisor@ger.local',
          roles: ['SUPERVISOR'],
          role: 'SUPERVISOR',
        },
      }),
    },
  );

  // A pagina abre no painel de Carteiras; os testes abaixo exercitam a Lista,
  // entao alternamos para ela apos montar.
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Lista' }));
}

describe('SupervisionPage', () => {
  beforeEach(() => {
    vi.mocked(getCollectionCases).mockResolvedValue(
      createMockCollectionCasesPage(1, 10),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abre no painel de Carteiras e alterna para a Lista', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/supervisao" element={<SupervisionPage />} />
      </Routes>,
      {
        route: '/supervisao',
        session: createMockSession({
          user: {
            id: 'supervisor',
            name: 'Supervisor SEBRATEL',
            email: 'supervisor@ger.local',
            roles: ['SUPERVISOR'],
            role: 'SUPERVISOR',
          },
        }),
      },
    );

    // Landing view = Carteiras (a lista ainda nao aparece).
    expect(
      await screen.findByText('Carteiras por atendente'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Casos de cobrança')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lista' }));

    expect(await screen.findByText('Casos de cobrança')).toBeInTheDocument();
  });

  it('le filtros da URL', async () => {
    await renderSupervision('/supervisao?status=NO_RESPONSE&search=Horizonte');

    expect(await screen.findByText('Casos de cobrança')).toBeInTheDocument();

    await waitFor(() => {
      expect(getCollectionCases).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'NO_RESPONSE',
          search: 'Horizonte',
        }),
      );
    });
  });

  it('alterar busca atualiza URL', async () => {
    const user = userEvent.setup();
    await renderSupervision('/supervisao');

    await screen.findByText('Casos de cobrança');

    const searchInput = screen.getByPlaceholderText(
      'Cliente, documento ou contrato',
    );
    await user.type(searchInput, 'Mercado');

    await waitFor(
      () => {
        expect(screen.getByTestId('location-search')).toHaveTextContent(
          'search=Mercado',
        );
      },
      { timeout: 2000 },
    );
  });

  it('alterar status atualiza query params', async () => {
    const user = userEvent.setup();
    await renderSupervision('/supervisao');

    await screen.findByText('Casos de cobrança');

    await user.click(screen.getByRole('button', { name: /Mais filtros/i }));

    await user.selectOptions(
      screen.getByDisplayValue('Todos os status'),
      'IN_COLLECTION',
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'status=IN_COLLECTION',
      );
    });

    expect(getCollectionCases).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'IN_COLLECTION', page: 1 }),
    );
  });

  it('segmento "Já contatados" filtra por contato manual', async () => {
    const user = userEvent.setup();
    await renderSupervision('/supervisao');

    await screen.findByText('Casos de cobrança');

    await user.click(screen.getByRole('tab', { name: 'Já contatados' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'interactionStatus=contacted',
      );
    });

    expect(getCollectionCases).toHaveBeenCalledWith(
      expect.objectContaining({ interactionStatus: 'contacted', page: 1 }),
    );
  });

  it('limpar filtros remove query params', async () => {
    const user = userEvent.setup();
    await renderSupervision('/supervisao?status=NO_RESPONSE&search=Horizonte');

    await screen.findByText('Limpar filtros');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toBeEmptyDOMElement();
    });
  });

  it('paginacao preserva filtros', async () => {
    const user = userEvent.setup();
    vi.mocked(getCollectionCases).mockImplementation((params = {}) =>
      Promise.resolve(
        createMockCollectionCasesPage(params.page ?? 1, params.limit ?? 10),
      ),
    );

    await renderSupervision('/supervisao?status=NO_RESPONSE');

    await screen.findByText('Casos de cobrança');
    await user.click(await screen.findByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(getCollectionCases).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'NO_RESPONSE',
          page: 2,
        }),
      );
    });

    expect(screen.getByTestId('location-search')).toHaveTextContent(
      'status=NO_RESPONSE',
    );
  });

  it('ordenacao atualiza query params', async () => {
    const user = userEvent.setup();
    await renderSupervision('/supervisao');

    await screen.findByText('Casos de cobrança');
    await user.click(screen.getByRole('button', { name: /Dias em atraso/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'sortBy=daysOverdue',
      );
    });
  });

  it('sem resultados mostra EmptyState', async () => {
    vi.mocked(getCollectionCases).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    await renderSupervision('/supervisao?status=NO_RESPONSE');

    expect(
      await screen.findByText('Nenhum caso encontrado'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Nenhum caso corresponde aos filtros aplicados. Ajuste os critérios ou limpe os filtros.',
      ),
    ).toBeInTheDocument();
  });

  it('erro mostra ErrorState com retry', async () => {
    vi.mocked(getCollectionCases).mockRejectedValue(new Error('offline'));

    await renderSupervision('/supervisao');

    expect(
      await screen.findByText('Não foi possível carregar os casos'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
  });

  it('restaura filtros operacionais da URL', async () => {
    await renderSupervision(
      '/supervisao?slaStatus=overdue&interactionStatus=not_contacted&promiseStatus=ACTIVE&createdToday=true',
    );

    await screen.findByText('Casos de cobrança');

    expect(screen.getByRole('combobox', { name: 'SLA' })).toHaveValue(
      'overdue',
    );
    expect(screen.getByRole('combobox', { name: 'Criados hoje' })).toHaveValue(
      'true',
    );
    expect(screen.getByRole('combobox', { name: 'Interação' })).toHaveValue(
      'not_contacted',
    );
    expect(screen.getByRole('combobox', { name: 'Promessa' })).toHaveValue(
      'ACTIVE',
    );
  });

  it('limpar filtros remove filtros operacionais da URL', async () => {
    const user = userEvent.setup();
    await renderSupervision(
      '/supervisao?interactionStatus=not_contacted&promiseStatus=ACTIVE&createdToday=true',
    );

    await screen.findByText('Casos de cobrança');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(/^$/);
    });
  });
});
