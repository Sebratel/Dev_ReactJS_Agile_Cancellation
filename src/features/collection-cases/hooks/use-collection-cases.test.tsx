import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { createQueryWrapper } from '@/test/query-test-utils';
import { createMockCollectionCasesPage } from '@/test/fixtures/api-fixtures';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCases: vi.fn(),
    getCollectionCaseById: vi.fn(),
  }),
);

import { getCollectionCases } from '@/features/collection-cases/services/collection-cases.service';

describe('useCollectionCases', () => {
  it('recebe filtros corretamente', async () => {
    vi.mocked(getCollectionCases).mockResolvedValue(
      createMockCollectionCasesPage(1, 10),
    );

    const params = {
      page: 1,
      limit: 10,
      status: 'IN_COLLECTION',
      search: 'Horizonte',
      sortBy: 'daysOverdue' as const,
      sortDirection: 'desc' as const,
    };

    const { result } = renderHook(() => useCollectionCases(params), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getCollectionCases).toHaveBeenCalledWith(params);
  });
});
