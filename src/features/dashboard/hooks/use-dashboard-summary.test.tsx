import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardSummary } from '@/features/dashboard/hooks/use-dashboard-summary';
import { mockDashboardSummaryResponse } from '@/test/fixtures/api-fixtures';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock('@/features/dashboard/services/dashboard.service', () => ({
  getDashboardSummary: vi.fn(),
}));

import { getDashboardSummary } from '@/features/dashboard/services/dashboard.service';

describe('useDashboardSummary', () => {
  it('consome service de dashboard', async () => {
    vi.mocked(getDashboardSummary).mockResolvedValue(
      mockDashboardSummaryResponse,
    );

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getDashboardSummary).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockDashboardSummaryResponse);
  });
});
