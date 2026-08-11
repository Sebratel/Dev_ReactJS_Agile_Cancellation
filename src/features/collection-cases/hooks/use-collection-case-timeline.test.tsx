import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCollectionCaseTimeline } from '@/features/collection-cases/hooks/use-collection-case-timeline';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCaseTimeline: vi.fn(),
  }),
);

import { getCollectionCaseTimeline } from '@/features/collection-cases/services/collection-cases.service';

describe('useCollectionCaseTimeline', () => {
  it('chama service com caseId', async () => {
    vi.mocked(getCollectionCaseTimeline).mockResolvedValue({
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
    });

    const wrapper = createQueryWrapper();
    const { result } = renderHook(
      () => useCollectionCaseTimeline('case_0001'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getCollectionCaseTimeline).toHaveBeenCalledWith('case_0001');
    expect(result.current.data?.events).toHaveLength(1);
  });
});
