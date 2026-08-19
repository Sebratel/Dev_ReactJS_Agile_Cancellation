import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BulkContactWhatsAppJobsHistory } from '@/features/collection-cases/components/bulk-contact-whatsapp-jobs-history';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    listBulkContactWhatsAppJobs: vi.fn(),
  }),
);

import { listBulkContactWhatsAppJobs } from '@/features/collection-cases/services/collection-cases.service';

describe('BulkContactWhatsAppJobsHistory', () => {
  it('mostra estado vazio quando nao ha envios', async () => {
    vi.mocked(listBulkContactWhatsAppJobs).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderWithProviders(
      <BulkContactWhatsAppJobsHistory page={1} onPageChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum envio em lote ainda'),
      ).toBeInTheDocument();
    });
  });

  it('lista os jobs com status e contadores', async () => {
    vi.mocked(listBulkContactWhatsAppJobs).mockResolvedValue({
      items: [
        {
          id: 'job_1',
          status: 'COMPLETED',
          totalCount: 10,
          sentCount: 8,
          skippedCount: 2,
          failedCount: 0,
          createdAt: '2026-08-01T12:00:00.000Z',
          startedAt: '2026-08-01T12:00:01.000Z',
          finishedAt: '2026-08-01T12:00:20.000Z',
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithProviders(
      <BulkContactWhatsAppJobsHistory page={1} onPageChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Concluído')).toBeInTheDocument();
    });
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
