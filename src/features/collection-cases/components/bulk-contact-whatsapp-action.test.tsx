import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BulkContactWhatsAppAction } from '@/features/collection-cases/components/bulk-contact-whatsapp-action';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    createBulkContactWhatsAppJob: vi.fn(),
    getBulkContactWhatsAppJob: vi.fn(),
  }),
);

import {
  createBulkContactWhatsAppJob,
  getBulkContactWhatsAppJob,
} from '@/features/collection-cases/services/collection-cases.service';

describe('BulkContactWhatsAppAction', () => {
  it('mostra confirmacao com a contagem de casos selecionados', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <BulkContactWhatsAppAction
        caseIds={['case_1', 'case_2', 'case_3']}
        onFinished={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Enviar HSM em massa' }),
    );

    expect(
      screen.getByText(/3 casos selecionados/),
    ).toBeInTheDocument();
  });

  it('inicia o job e acompanha o progresso ate concluir', async () => {
    const user = userEvent.setup();
    vi.mocked(createBulkContactWhatsAppJob).mockResolvedValue({
      id: 'job_1',
      status: 'PENDING',
      totalCount: 2,
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
      totalCount: 2,
      sentCount: 1,
      skippedCount: 1,
      failedCount: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      startedAt: '2026-08-01T00:00:01.000Z',
      finishedAt: '2026-08-01T00:00:02.000Z',
    });

    const onFinished = vi.fn();
    renderWithProviders(
      <BulkContactWhatsAppAction
        caseIds={['case_1', 'case_2']}
        onFinished={onFinished}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Enviar HSM em massa' }),
    );
    await user.click(screen.getByRole('button', { name: 'Iniciar envio' }));

    expect(createBulkContactWhatsAppJob).toHaveBeenCalledWith(
      ['case_1', 'case_2'],
      expect.anything(),
    );

    await waitFor(() => {
      expect(screen.getByText('Envio concluído.')).toBeInTheDocument();
    });
    expect(
      screen.getByText('1 enviados · 1 pulados · 0 falharam'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(onFinished).toHaveBeenCalled();
  });
});
