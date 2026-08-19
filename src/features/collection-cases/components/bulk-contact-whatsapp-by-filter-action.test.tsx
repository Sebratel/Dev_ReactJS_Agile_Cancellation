import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BulkContactWhatsAppByFilterAction } from '@/features/collection-cases/components/bulk-contact-whatsapp-by-filter-action';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    createBulkContactWhatsAppJobByFilter: vi.fn(),
    getBulkContactWhatsAppJob: vi.fn(),
  }),
);

import {
  createBulkContactWhatsAppJobByFilter,
  getBulkContactWhatsAppJob,
} from '@/features/collection-cases/services/collection-cases.service';

describe('BulkContactWhatsAppByFilterAction', () => {
  it('fica desabilitado quando nao ha casos correspondentes', () => {
    renderWithProviders(
      <BulkContactWhatsAppByFilterAction
        filters={{}}
        matchCount={0}
        onFinished={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Enviar HSM para os casos filtrados' }),
    ).toBeDisabled();
  });

  it('envia os filtros atuais e acompanha o progresso ate concluir', async () => {
    const user = userEvent.setup();
    vi.mocked(createBulkContactWhatsAppJobByFilter).mockResolvedValue({
      id: 'job_1',
      status: 'PENDING',
      totalCount: 40,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      startedAt: null,
      finishedAt: null,
    });
    vi.mocked(getBulkContactWhatsAppJob).mockResolvedValue({
      id: 'job_1',
      status: 'COMPLETED',
      totalCount: 40,
      sentCount: 35,
      skippedCount: 5,
      failedCount: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      startedAt: '2026-08-01T00:00:01.000Z',
      finishedAt: '2026-08-01T00:00:10.000Z',
    });

    const onFinished = vi.fn();
    const filters = { contractStatus: 'SUSPENDED' };
    renderWithProviders(
      <BulkContactWhatsAppByFilterAction
        filters={filters}
        matchCount={40}
        onFinished={onFinished}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Enviar HSM para os casos filtrados' }),
    );
    expect(screen.getByText(/40 clientes que correspondem/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Iniciar envio' }));

    expect(createBulkContactWhatsAppJobByFilter).toHaveBeenCalledWith(
      filters,
      expect.anything(),
    );

    await waitFor(() => {
      expect(screen.getByText('Envio concluído.')).toBeInTheDocument();
    });
    expect(
      screen.getByText('35 enviados · 5 pulados · 0 falharam'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(onFinished).toHaveBeenCalled();
  });
});
