import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CollectionCaseDetailPage from '@/features/collection-cases/pages/collection-case-detail-page';
import { ApiError } from '@/services/api/api-error';
import { createMockSession } from '@/test/auth-test-utils';
import { mockCollectionCaseDetails } from '@/test/fixtures/api-fixtures';
import { renderWithProviders } from '@/test/test-utils';
import { formatDateTimePtBR } from '@/utils/formatters';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCases: vi.fn(),
    getCollectionCaseById: vi.fn(),
    createCollectionAttempt: vi.fn(),
    createPaymentPromise: vi.fn(),
  }),
);

vi.mock(
  '@/features/collection-cases/hooks/use-create-collection-attempt',
  () => ({
    useCreateCollectionAttempt: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    }),
  }),
);

vi.mock('@/features/collection-cases/hooks/use-create-payment-promise', () => ({
  useCreatePaymentPromise: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

const fulfillMutateAsync = vi.fn();

vi.mock(
  '@/features/collection-cases/hooks/use-fulfill-payment-promise',
  () => ({
    useFulfillPaymentPromise: () => ({
      mutateAsync: fulfillMutateAsync,
      isPending: false,
    }),
  }),
);

vi.mock('@/features/collection-cases/hooks/use-break-payment-promise', () => ({
  useBreakPaymentPromise: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/collection-cases/hooks/use-cancel-payment-promise', () => ({
  useCancelPaymentPromise: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/collection-cases/hooks/use-assign-case', () => ({
  useAssignCase: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/features/users/hooks/use-users', () => ({
  useUsers: () => ({
    data: {
      items: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock(
  '@/features/collection-cases/hooks/use-collection-case-timeline',
  () => ({
    useCollectionCaseTimeline: () => ({
      isLoading: false,
      isError: false,
      data: {
        caseId: 'case_0001',
        events: [
          {
            id: 'case-case_0001-created',
            type: 'CASE_CREATED',
            title: 'Caso de cobranca criado',
            description: 'Caso aberto.',
            occurredAt: new Date().toISOString(),
          },
        ],
      },
      refetch: vi.fn(),
    }),
  }),
);

vi.mock(
  '@/features/collection-cases/hooks/use-send-case-to-cancellation',
  () => ({
    useSendCaseToCancellation: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  }),
);

import { getCollectionCaseById } from '@/features/collection-cases/services/collection-cases.service';

function renderDetailPage(route: string) {
  renderWithProviders(
    <Routes>
      <Route
        path="/supervisao/:caseId"
        element={<CollectionCaseDetailPage />}
      />
    </Routes>,
    {
      route,
      session: createMockSession(),
    },
  );
}

describe('CollectionCaseDetailPage', () => {
  it('renderiza dados principais do caso', async () => {
    const user = userEvent.setup();
    vi.mocked(getCollectionCaseById).mockResolvedValue(
      mockCollectionCaseDetails,
    );

    renderDetailPage('/supervisao/case_0001');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Construtora Horizonte',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('CTR-10428')).toBeInTheDocument();
    expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument();
    expect(screen.getAllByText('Marina Lopes').length).toBeGreaterThan(0);
    expect(screen.getByText('Resumo')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tentativas/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Nova tentativa de cobrança')).toBeInTheDocument();
    expect(screen.getByText('Tentativas de contato')).toBeInTheDocument();
    expect(screen.getByText('Próximo contato')).toBeInTheDocument();
    expect(
      screen.getByText(
        formatDateTimePtBR(
          mockCollectionCaseDetails.attempts[2]?.nextContactAt ?? '',
        ),
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Promessas/ }));

    expect(screen.getByText('Nova promessa de pagamento')).toBeInTheDocument();
    expect(screen.getByText('Promessas de pagamento')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Observação' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Criado em')).toBeInTheDocument();
    expect(
      screen.getByText('Pagamento parcelado acordado.'),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 2.500,00')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Marcar como cumprida' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Timeline/ }));

    expect(screen.getByText('Timeline do caso')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Faturas/ }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Faturas' }),
    ).toBeInTheDocument();
    expect(getCollectionCaseById).toHaveBeenCalledWith('case_0001');
    expect(
      screen.getByRole('button', { name: 'Encaminhar para cancelamento' }),
    ).toBeInTheDocument();
  });
  it('nao mostra botao quando caso ja possui cancelamento', async () => {
    const user = userEvent.setup();
    vi.mocked(getCollectionCaseById).mockResolvedValue({
      ...mockCollectionCaseDetails,
      status: 'CANCELLATION_IN_PROGRESS',
      cancellationProcess: {
        id: 'can_0001',
        status: 'PENDING',
        startedAt: new Date().toISOString(),
        completedAt: null,
        steps: [],
      },
    });

    renderDetailPage('/supervisao/case_0001');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Construtora Horizonte',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Encaminhar para cancelamento' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Cancelamento/ }));

    expect(screen.getByText('Processo de cancelamento')).toBeInTheDocument();
  });
  it('nao mostra acoes para promessa FULFILLED', async () => {
    const user = userEvent.setup();
    vi.mocked(getCollectionCaseById).mockResolvedValue({
      ...mockCollectionCaseDetails,
      promises: [
        {
          id: 'prm_fulfilled',
          status: 'FULFILLED',
          promisedAmount: '2500.00',
          promisedDate: new Date().toISOString(),
          notes: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderDetailPage('/supervisao/case_0001');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Construtora Horizonte',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Promessas/ }));

    expect(
      screen.queryByRole('button', { name: 'Marcar como cumprida' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Cumprida')).toBeInTheDocument();
  });
  it('nao mostra acoes para promessa BROKEN', async () => {
    const user = userEvent.setup();
    vi.mocked(getCollectionCaseById).mockResolvedValue({
      ...mockCollectionCaseDetails,
      promises: [
        {
          id: 'prm_broken',
          status: 'BROKEN',
          promisedAmount: '2500.00',
          promisedDate: new Date().toISOString(),
          notes: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderDetailPage('/supervisao/case_0001');

    await screen.findByRole('heading', {
      level: 1,
      name: 'Construtora Horizonte',
    });
    await user.click(screen.getByRole('tab', { name: /Promessas/ }));

    expect(await screen.findByText('Descumprida')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Marcar como quebrada' }),
    ).not.toBeInTheDocument();
  });
  it('mostra estado de erro quando API retorna 404', async () => {
    vi.mocked(getCollectionCaseById).mockRejectedValue(
      new ApiError(404, { message: 'Caso não encontrado' }),
    );

    renderDetailPage('/supervisao/case_missing');

    expect(await screen.findByText('Caso não encontrado')).toBeInTheDocument();
    expect(
      screen.getByText(
        'O identificador informado não corresponde a nenhum caso de cobrança ativo.',
      ),
    ).toBeInTheDocument();
  });
});
