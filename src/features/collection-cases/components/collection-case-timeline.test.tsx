import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CollectionCaseTimeline } from '@/features/collection-cases/components/collection-case-timeline';
import type { useCollectionCaseTimeline } from '@/features/collection-cases/hooks/use-collection-case-timeline';
import { ApiError } from '@/services/api/api-error';
import { createQueryWrapper } from '@/test/query-test-utils';

type UseCollectionCaseTimelineResult = ReturnType<
  typeof useCollectionCaseTimeline
>;

const useCollectionCaseTimelineMock = vi.fn();

vi.mock(
  '@/features/collection-cases/hooks/use-collection-case-timeline',
  () => ({
    useCollectionCaseTimeline: (...args: unknown[]) =>
      useCollectionCaseTimelineMock(
        ...args,
      ) as unknown as UseCollectionCaseTimelineResult,
  }),
);

function renderTimeline() {
  const wrapper = createQueryWrapper();

  return render(<CollectionCaseTimeline caseId="case_0001" />, { wrapper });
}

describe('CollectionCaseTimeline', () => {
  it('renderiza eventos da timeline', () => {
    useCollectionCaseTimelineMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        caseId: 'case_0001',
        events: [
          {
            id: 'case-case_0001-created',
            type: 'CASE_CREATED',
            title: 'Caso de cobranca criado',
            description: 'Caso aberto para Construtora Horizonte.',
            occurredAt: '2026-01-01T10:00:00.000Z',
            actorName: null,
          },
          {
            id: 'promise-prm_0001-fulfilled',
            type: 'PAYMENT_PROMISE_FULFILLED',
            title: 'Promessa de pagamento cumprida',
            description: 'Pagamento confirmado.',
            occurredAt: '2026-03-02T15:00:00.000Z',
            actorName: 'Marina Lopes',
          },
        ],
      },
      refetch: vi.fn(),
    });

    renderTimeline();

    expect(screen.getByText('Timeline do caso')).toBeInTheDocument();
    expect(screen.getByText('Caso de cobranca criado')).toBeInTheDocument();
    expect(
      screen.getByText('Promessa de pagamento cumprida'),
    ).toBeInTheDocument();
    expect(screen.getByText('Promessa cumprida')).toBeInTheDocument();
    expect(screen.getByText('Por: Marina Lopes')).toBeInTheDocument();
  });

  it('mostra loading state', () => {
    useCollectionCaseTimelineMock.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    });

    renderTimeline();

    expect(screen.getByText('Timeline do caso')).toBeInTheDocument();
  });

  it('mostra empty state', () => {
    useCollectionCaseTimelineMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { caseId: 'case_0001', events: [] },
      refetch: vi.fn(),
    });

    renderTimeline();

    expect(screen.getByText('Nenhum evento registrado')).toBeInTheDocument();
  });

  it('mostra error state com retry', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    useCollectionCaseTimelineMock.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new ApiError(500, { message: 'Erro interno' }),
      data: undefined,
      refetch,
    });

    renderTimeline();

    expect(
      screen.getByText('Não foi possível carregar a timeline'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(refetch).toHaveBeenCalled();
  });
});
