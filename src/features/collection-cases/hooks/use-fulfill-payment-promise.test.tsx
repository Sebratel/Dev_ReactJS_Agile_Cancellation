import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFulfillPaymentPromise } from '@/features/collection-cases/hooks/use-fulfill-payment-promise';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    fulfillPaymentPromise: vi.fn(),
  }),
);

import { fulfillPaymentPromise } from '@/features/collection-cases/services/collection-cases.service';

describe('useFulfillPaymentPromise', () => {
  it('chama service e invalida detalhe do caso', async () => {
    vi.mocked(fulfillPaymentPromise).mockResolvedValue({
      id: 'prm_new',
      collectionCaseId: 'case_0001',
      status: 'FULFILLED',
      promisedAmount: '1500.00',
      promisedDate: '2026-07-01T00:00:00.000Z',
      notes: null,
      fulfilledAt: new Date().toISOString(),
      brokenAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      createdByUserId: 'usr_marina',
    });

    const wrapper = createQueryWrapper();
    const { result } = renderHook(() => useFulfillPaymentPromise('case_0001'), {
      wrapper,
    });

    await result.current.mutateAsync({ promiseId: 'prm_new' });

    await waitFor(() => {
      expect(fulfillPaymentPromise).toHaveBeenCalledWith(
        'case_0001',
        'prm_new',
        {},
      );
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
