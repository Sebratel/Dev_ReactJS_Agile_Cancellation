import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WhatsappBulkContactPage from '@/features/whatsapp-bulk-contact/pages/whatsapp-bulk-contact-page';
import { createMockCollectionCasesPage } from '@/test/fixtures/api-fixtures';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getCollectionCases: vi.fn(),
    createBulkContactWhatsAppJobByFilter: vi.fn(),
    getBulkContactWhatsAppJob: vi.fn(),
    listBulkContactWhatsAppJobs: vi.fn(),
  }),
);

import {
  getCollectionCases,
  listBulkContactWhatsAppJobs,
} from '@/features/collection-cases/services/collection-cases.service';

describe('WhatsappBulkContactPage', () => {
  it('mostra a contagem de clientes correspondentes e o historico', async () => {
    vi.mocked(getCollectionCases).mockResolvedValue(
      createMockCollectionCasesPage(1, 1),
    );
    vi.mocked(listBulkContactWhatsAppJobs).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderWithProviders(<WhatsappBulkContactPage />);

    expect(screen.getByText('Envio de HSM em massa')).toBeInTheDocument();

    expect(screen.getByText('Clientes selecionados')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum envio em lote ainda'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', {
        name: 'Enviar HSM para os casos filtrados',
      }),
    ).toBeInTheDocument();
  });
});
