import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOverdueDateSummary } from '@/features/collection-cases/hooks/use-overdue-date-summary';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getOverdueDateSummary: vi.fn(),
  }),
);

import { getOverdueDateSummary } from '@/features/collection-cases/services/collection-cases.service';

describe('useOverdueDateSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('descarta pagina/limite/ordenacao antes de chamar a API', async () => {
    vi.mocked(getOverdueDateSummary).mockResolvedValue({
      firstDueDates: [{ date: '2026-08-04', count: 12 }],
      secondDueDates: [],
    });

    const { result } = renderHook(
      () =>
        useOverdueDateSummary({
          page: 3,
          limit: 10,
          sortBy: 'daysOverdue',
          sortDirection: 'desc',
          contractStatus: 'ACTIVE',
        }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getOverdueDateSummary).toHaveBeenCalledWith(
      expect.objectContaining({ contractStatus: 'ACTIVE' }),
    );
    const calledWith = vi.mocked(getOverdueDateSummary).mock.calls[0][0];
    expect(calledWith?.page).toBeUndefined();
    expect(calledWith?.sortBy).toBeUndefined();
    expect(result.current.data?.firstDueDates).toHaveLength(1);
  });

  it('nao chama a API quando enabled e false', () => {
    renderHook(() => useOverdueDateSummary({}, { enabled: false }), {
      wrapper: createQueryWrapper(),
    });

    expect(getOverdueDateSummary).not.toHaveBeenCalled();
  });
});
