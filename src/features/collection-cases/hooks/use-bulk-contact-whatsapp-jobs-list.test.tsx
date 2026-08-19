import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBulkContactWhatsAppJobsList } from '@/features/collection-cases/hooks/use-bulk-contact-whatsapp-jobs-list';
import { createQueryWrapper } from '@/test/query-test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    listBulkContactWhatsAppJobs: vi.fn(),
  }),
);

import { listBulkContactWhatsAppJobs } from '@/features/collection-cases/services/collection-cases.service';

describe('useBulkContactWhatsAppJobsList', () => {
  it('busca a pagina pedida', async () => {
    vi.mocked(listBulkContactWhatsAppJobs).mockResolvedValue({
      items: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useBulkContactWhatsAppJobsList(2), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(listBulkContactWhatsAppJobs).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
    });
  });
});
