import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContactCustomerWhatsAppAction } from '@/features/collection-cases/components/contact-customer-whatsapp-action';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    contactCustomerByWhatsApp: vi.fn(),
  }),
);

import { contactCustomerByWhatsApp } from '@/features/collection-cases/services/collection-cases.service';

describe('ContactCustomerWhatsAppAction', () => {
  it('pede confirmacao antes de enviar — nao dispara so com o clique no icone', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ContactCustomerWhatsAppAction
        caseId="case_0001"
        customerName="Construtora Horizonte"
        customerPhone="(51) 99911-2233"
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Enviar WhatsApp para Construtora Horizonte',
      }),
    );

    expect(
      screen.getByText('Enviar mensagem no WhatsApp?'),
    ).toBeInTheDocument();
    expect(contactCustomerByWhatsApp).not.toHaveBeenCalled();
  });

  it('cancelar fecha o dialog sem enviar', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ContactCustomerWhatsAppAction
        caseId="case_0001"
        customerName="Construtora Horizonte"
        customerPhone="(51) 99911-2233"
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Enviar WhatsApp para Construtora Horizonte',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(
      screen.queryByText('Enviar mensagem no WhatsApp?'),
    ).not.toBeInTheDocument();
    expect(contactCustomerByWhatsApp).not.toHaveBeenCalled();
  });

  it('confirmar envia a mensagem', async () => {
    const user = userEvent.setup();
    vi.mocked(contactCustomerByWhatsApp).mockResolvedValue({
      attemptId: 'att_1',
      provider: 'n8n',
      statusCode: 200,
      codAtendimento: '5081836',
      codMensagem: '82498574',
      awaitingReply: true,
    });

    renderWithProviders(
      <ContactCustomerWhatsAppAction
        caseId="case_0001"
        customerName="Construtora Horizonte"
        customerPhone="(51) 99911-2233"
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Enviar WhatsApp para Construtora Horizonte',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    await waitFor(() => {
      expect(contactCustomerByWhatsApp).toHaveBeenCalledWith('case_0001');
    });
  });
});
