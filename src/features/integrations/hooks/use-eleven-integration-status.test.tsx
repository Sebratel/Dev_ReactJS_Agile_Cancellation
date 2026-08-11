import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useElevenIntegrationStatus } from '@/features/integrations/hooks/use-eleven-integration-status';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock('@/features/integrations/services/integrations.service', () => ({
  getElevenIntegrationStatus: vi.fn(),
}));

import { getElevenIntegrationStatus } from '@/features/integrations/services/integrations.service';

describe('useElevenIntegrationStatus', () => {
  it('consome service de status Eleven', async () => {
    vi.mocked(getElevenIntegrationStatus).mockResolvedValue({
      mode: 'stub',
      available: true,
      message: 'Integração Eleven em modo simulado.',
    });

    const { result } = renderHook(() => useElevenIntegrationStatus(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getElevenIntegrationStatus).toHaveBeenCalledTimes(1);
    expect(result.current.data?.available).toBe(true);
  });
});
