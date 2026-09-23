import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSendCaseToCancellation } from '@/features/collection-cases/hooks/use-send-case-to-cancellation';
import { queryKeys } from '@/services/api/query-keys';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    sendCaseToCancellation: vi.fn(),
  }),
);

import { sendCaseToCancellation } from '@/features/collection-cases/services/collection-cases.service';

describe('useSendCaseToCancellation', () => {
  it('chama service e invalida detalhe, timeline e lista', async () => {
    vi.mocked(sendCaseToCancellation).mockResolvedValue({
      id: 'can_new',
      collectionCaseId: 'case_0001',
      status: 'PENDING',
      reason: 'Cliente recusou acordo.',
      notes: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
    });

    const wrapper = createQueryWrapper();
    const { result } = renderHook(
      () => useSendCaseToCancellation('case_0001'),
      { wrapper },
    );

    await result.current.mutateAsync({
      reason: 'Cliente recusou acordo.',
      assignedUserId: 'user-cancellation',
    });

    await waitFor(() => {
      expect(sendCaseToCancellation).toHaveBeenCalledWith('case_0001', {
        reason: 'Cliente recusou acordo.',
        assignedUserId: 'user-cancellation',
      });
    });

    expect(result.current.isSuccess).toBe(true);
    expect(queryKeys.collectionCases.detail('case_0001')).toEqual([
      'collection-cases',
      'detail',
      'case_0001',
    ]);
  });
});
