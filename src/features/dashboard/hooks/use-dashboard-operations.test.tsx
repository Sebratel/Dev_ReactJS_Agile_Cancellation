import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardOperations } from '@/features/dashboard/hooks/use-dashboard-operations';
import { mockDashboardOperationsResponse } from '@/test/fixtures/api-fixtures';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock('@/features/dashboard/services/dashboard.service', () => ({
  getDashboardOperations: vi.fn(),
}));

import { getDashboardOperations } from '@/features/dashboard/services/dashboard.service';

describe('useDashboardOperations', () => {
  it('consome service de dashboard operacional', async () => {
    vi.mocked(getDashboardOperations).mockResolvedValue(
      mockDashboardOperationsResponse,
    );

    const { result } = renderHook(() => useDashboardOperations(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getDashboardOperations).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockDashboardOperationsResponse);
  });
});
