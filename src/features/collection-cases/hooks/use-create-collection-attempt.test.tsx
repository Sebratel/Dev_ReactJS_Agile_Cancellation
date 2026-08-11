import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCreateCollectionAttempt } from '@/features/collection-cases/hooks/use-create-collection-attempt';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    createCollectionAttempt: vi.fn(),
  }),
);

import { createCollectionAttempt } from '@/features/collection-cases/services/collection-cases.service';

describe('useCreateCollectionAttempt', () => {
  it('chama service e invalida detalhe do caso', async () => {
    vi.mocked(createCollectionAttempt).mockResolvedValue({
      id: 'att_new',
      collectionCaseId: 'case_0001',
      channel: 'PHONE',
      result: 'NO_ANSWER',
      attemptedAt: new Date().toISOString(),
      notes: null,
      nextContactAt: null,
      performedByUserId: 'usr_marina',
    });

    const wrapper = createQueryWrapper();
    const { result } = renderHook(
      () => useCreateCollectionAttempt('case_0001'),
      { wrapper },
    );

    await result.current.mutateAsync({
      channel: 'PHONE',
      result: 'NO_ANSWER',
    });

    await waitFor(() => {
      expect(createCollectionAttempt).toHaveBeenCalledWith('case_0001', {
        channel: 'PHONE',
        result: 'NO_ANSWER',
      });
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
