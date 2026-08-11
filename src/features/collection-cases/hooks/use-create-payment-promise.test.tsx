import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCreatePaymentPromise } from '@/features/collection-cases/hooks/use-create-payment-promise';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    createPaymentPromise: vi.fn(),
  }),
);

import { createPaymentPromise } from '@/features/collection-cases/services/collection-cases.service';

describe('useCreatePaymentPromise', () => {
  it('chama service e invalida detalhe do caso', async () => {
    vi.mocked(createPaymentPromise).mockResolvedValue({
      id: 'prm_new',
      collectionCaseId: 'case_0001',
      status: 'ACTIVE',
      promisedAmount: '1500.00',
      promisedDate: '2026-07-01T00:00:00.000Z',
      notes: null,
      fulfilledAt: null,
      brokenAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      createdByUserId: 'usr_marina',
    });

    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCreatePaymentPromise('case_0001'), {
      wrapper,
    });

    await result.current.mutateAsync({
      promisedAmount: 1500,
      promisedDate: '2026-07-01T00:00:00.000Z',
    });

    await waitFor(() => {
      expect(createPaymentPromise).toHaveBeenCalledWith('case_0001', {
        promisedAmount: 1500,
        promisedDate: '2026-07-01T00:00:00.000Z',
      });
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
