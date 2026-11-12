import { type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssignCase } from '@/features/collection-cases/hooks/use-assign-case';
import { useAutoDistribute } from '@/features/collection-cases/hooks/use-auto-distribute';
import { useBreakPaymentPromise } from '@/features/collection-cases/hooks/use-break-payment-promise';
import { useBulkAssignCases } from '@/features/collection-cases/hooks/use-bulk-assign-cases';
import { useBulkSendToCancellation } from '@/features/collection-cases/hooks/use-bulk-send-to-cancellation';
import { useCancelPaymentPromise } from '@/features/collection-cases/hooks/use-cancel-payment-promise';
import { useCompleteCancellationStep } from '@/features/collection-cases/hooks/use-complete-cancellation-step';
import { useContactCustomerWhatsApp } from '@/features/collection-cases/hooks/use-contact-customer-whatsapp';
import { useCreateCaseNote } from '@/features/collection-cases/hooks/use-create-case-note';
import { useCreateElevenCancellationRequest } from '@/features/collection-cases/hooks/use-create-eleven-cancellation-request';
import { useRevertCancellation } from '@/features/collection-cases/hooks/use-revert-cancellation';
import { useReopenCancelled } from '@/features/cancelled-clients/hooks/use-reopen-cancelled';
import * as casesService from '@/features/collection-cases/services/collection-cases.service';
import * as caseNotesService from '@/features/collection-cases/services/case-notes.service';
import * as cancellationsService from '@/features/cancellations/services/cancellations.service';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    assignCase: vi.fn(),
    autoDistribute: vi.fn(),
    breakPaymentPromise: vi.fn(),
    bulkAssignCases: vi.fn(),
    bulkSendToCancellation: vi.fn(),
    cancelPaymentPromise: vi.fn(),
    contactCustomerByWhatsApp: vi.fn(),
    revertCancellation: vi.fn(),
    reopenCancelledCases: vi.fn(),
  }),
);
vi.mock('@/features/collection-cases/services/case-notes.service', () => ({
  createCaseNote: vi.fn(),
  getCaseNotes: vi.fn(),
}));
vi.mock('@/features/cancellations/services/cancellations.service', () => ({
  completeCancellationStep: vi.fn(),
  createElevenCancellationRequest: vi.fn(),
}));

function setup<T>(useHook: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(useHook, { wrapper });
  return { ...hook, invalidate };
}

function invalidatedKeys(invalidate: { mock: { calls: unknown[][] } }) {
  return invalidate.mock.calls.map(
    (call) => (call[0] as { queryKey: readonly unknown[] }).queryKey,
  );
}

describe('hooks de mutacao de casos de cobranca', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAssignCase chama o servico e invalida detalhe, timeline e lista', async () => {
    vi.mocked(casesService.assignCase).mockResolvedValue({} as never);
    const { result, invalidate } = setup(() => useAssignCase('k1'));

    await act(async () => {
      await result.current.mutateAsync({
        assignedUserId: 'u1',
      });
    });

    expect(casesService.assignCase).toHaveBeenCalledWith('k1', {
      assignedUserId: 'u1',
    });
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(invalidatedKeys(invalidate))).toContain('k1');
  });

  it.each([
    ['useBreakPaymentPromise', useBreakPaymentPromise, 'breakPaymentPromise'],
    [
      'useCancelPaymentPromise',
      useCancelPaymentPromise,
      'cancelPaymentPromise',
    ],
  ] as const)(
    '%s envia notes quando informadas e invalida 3 consultas',
    async (_name, useHook, serviceFn) => {
      vi.mocked(casesService[serviceFn]).mockResolvedValue({} as never);
      const { result, invalidate } = setup(() => useHook('k1'));

      await act(async () => {
        await result.current.mutateAsync({ promiseId: 'p1', notes: 'obs' });
      });
      await act(async () => {
        await result.current.mutateAsync({ promiseId: 'p2' });
      });

      expect(casesService[serviceFn]).toHaveBeenNthCalledWith(1, 'k1', 'p1', {
        notes: 'obs',
      });
      expect(casesService[serviceFn]).toHaveBeenNthCalledWith(
        2,
        'k1',
        'p2',
        {},
      );
      expect(invalidate).toHaveBeenCalledTimes(6);
    },
  );

  it.each([
    ['useAutoDistribute', useAutoDistribute, 'autoDistribute'],
    ['useBulkAssignCases', useBulkAssignCases, 'bulkAssignCases'],
    [
      'useBulkSendToCancellation',
      useBulkSendToCancellation,
      'bulkSendToCancellation',
    ],
  ] as const)(
    '%s repassa o payload e invalida a lista de casos',
    async (_name, useHook, serviceFn) => {
      vi.mocked(casesService[serviceFn]).mockResolvedValue({} as never);
      const { result, invalidate } = setup(() => useHook());
      const payload = { caseIds: ['a'] } as never;

      await act(async () => {
        await result.current.mutateAsync(payload);
      });

      expect(vi.mocked(casesService[serviceFn]).mock.calls[0]?.[0]).toEqual(
        payload,
      );
      expect(invalidate).toHaveBeenCalledTimes(1);
    },
  );

  it('useCompleteCancellationStep completa a etapa e invalida o caso', async () => {
    vi.mocked(cancellationsService.completeCancellationStep).mockResolvedValue(
      {} as never,
    );
    const { result, invalidate } = setup(() =>
      useCompleteCancellationStep('k1'),
    );

    await act(async () => {
      await result.current.mutateAsync({
        cancellationId: 'c1',
        stepCode: 'S1',
        payload: { notes: 'ok' },
      });
    });

    expect(cancellationsService.completeCancellationStep).toHaveBeenCalledWith(
      'c1',
      'S1',
      { notes: 'ok' },
    );
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it('useCreateElevenCancellationRequest cria a solicitacao e invalida o caso', async () => {
    vi.mocked(
      cancellationsService.createElevenCancellationRequest,
    ).mockResolvedValue({} as never);
    const { result, invalidate } = setup(() =>
      useCreateElevenCancellationRequest('k1'),
    );

    await act(async () => {
      await result.current.mutateAsync({
        cancellationId: 'c1',
        payload: { reason: 'x' } as never,
      });
    });

    expect(
      cancellationsService.createElevenCancellationRequest,
    ).toHaveBeenCalledWith('c1', { reason: 'x' });
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it('useRevertCancellation tambem invalida o ranking de recuperacao', async () => {
    vi.mocked(casesService.revertCancellation).mockResolvedValue({} as never);
    const { result, invalidate } = setup(() => useRevertCancellation('k1'));

    await act(async () => {
      await result.current.mutateAsync({ reason: 'x' });
    });

    expect(casesService.revertCancellation).toHaveBeenCalledWith('k1', {
      reason: 'x',
    });
    expect(invalidate).toHaveBeenCalledTimes(4);
  });

  it('useContactCustomerWhatsApp dispara o contato e invalida o caso', async () => {
    vi.mocked(casesService.contactCustomerByWhatsApp).mockResolvedValue(
      {} as never,
    );
    const { result, invalidate } = setup(() =>
      useContactCustomerWhatsApp('k1'),
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(casesService.contactCustomerByWhatsApp).toHaveBeenCalledWith('k1');
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it('useCreateCaseNote cria a nota e invalida a lista de notas', async () => {
    vi.mocked(caseNotesService.createCaseNote).mockResolvedValue({} as never);
    const { result, invalidate } = setup(() => useCreateCaseNote('k1'));

    await act(async () => {
      await result.current.mutateAsync({ content: 'texto' });
    });

    expect(caseNotesService.createCaseNote).toHaveBeenCalledWith('k1', {
      content: 'texto',
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledTimes(1);
    });
  });

  it('useReopenCancelled devolve cancelados a carteira e invalida a lista', async () => {
    vi.mocked(casesService.reopenCancelledCases).mockResolvedValue({
      reopened: 1,
      skipped: 0,
    });
    const { result, invalidate } = setup(() => useReopenCancelled());

    await act(async () => {
      await result.current.mutateAsync({
        caseIds: ['k9'],
        assignedUserId: 'usr_1',
      });
    });

    expect(casesService.reopenCancelledCases).toHaveBeenCalledWith({
      caseIds: ['k9'],
      assignedUserId: 'usr_1',
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledTimes(1);
    });
  });
});
