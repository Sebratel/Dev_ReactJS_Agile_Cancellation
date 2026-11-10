import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryAuditDrawer } from '@/features/ranking/components/recovery-audit-drawer';
import { type RecoveryAuditResponse } from '@/features/ranking/types/ranking-api.types';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/features/ranking/services/ranking.service', () => ({
  getRecoveryRanking: vi.fn(),
  getRecoveryAudit: vi.fn(),
}));

import { getRecoveryAudit } from '@/features/ranking/services/ranking.service';

const audit: RecoveryAuditResponse = {
  periodFrom: '2026-11-01T00:00:00.000Z',
  periodTo: '2026-12-01T00:00:00.000Z',
  user: { id: 'u1', name: 'Débora', avatarUrl: null },
  erpAvailable: true,
  totalAmount: '99.90',
  verifiedCases: 1,
  cases: [
    {
      caseId: 'c1',
      customerName: 'ACME LTDA',
      contractCode: '10428',
      recoveredAt: '2026-11-04T19:50:00.000Z',
      recoveredAmount: '99.90',
      assignedTo: { id: 'u1', name: 'Débora' },
      paymentDay: '2026-11-04',
      paymentsAvailable: true,
      payments: [
        {
          titleNumber: '48213',
          paidDate: '2026-11-04',
          registeredAt: '2026-11-04T19:40:00.000Z',
          amount: '99.90',
          receivedAmount: '99.90',
          paymentForm: 'PIX',
        },
      ],
      contacts: [
        {
          id: 'a1',
          attemptedAt: '2026-11-04T16:08:00.000Z',
          result: 'PROMISE_MADE',
          channel: 'PHONE',
          notes: 'Prometeu pagar via Pix',
          performedBy: { id: 'u1', name: 'Débora' },
          effective: true,
          beforePayment: true,
          credited: true,
        },
      ],
      checks: [
        {
          key: 'payment_confirmed',
          label: 'Pagamento confirmado no ERP',
          status: 'ok',
          detail: '1 baixa(s)',
        },
        {
          key: 'contact_before_payment',
          label: 'Contato feito até o dia do pagamento',
          status: 'fail',
          detail: 'Nenhum contato efetivo',
        },
      ],
      verified: false,
    },
  ],
};

describe('RecoveryAuditDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRecoveryAudit).mockResolvedValue(audit);
  });

  it('mostra pagamento, contato e as verificacoes de cada recuperacao', async () => {
    renderWithProviders(
      <RecoveryAuditDrawer
        agent={{ userId: 'u1', name: 'Débora' }}
        period="current_month"
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('ACME LTDA')).toBeInTheDocument();
    expect(screen.getByText(/Conferência do crédito/)).toBeInTheDocument();
    expect(screen.getByText('Pagamento confirmado no ERP')).toBeInTheDocument();
    expect(
      screen.getByText('Contato feito até o dia do pagamento'),
    ).toBeInTheDocument();
    expect(screen.getByText(/sustenta o crédito/)).toBeInTheDocument();
    expect(screen.getByText(/Título 48213/)).toBeInTheDocument();
    expect(screen.getByText('Revisar')).toBeInTheDocument();
    expect(getRecoveryAudit).toHaveBeenCalledWith('u1', 'current_month');
  });

  it('nao busca nada enquanto nenhum atendente esta selecionado', () => {
    renderWithProviders(
      <RecoveryAuditDrawer
        agent={null}
        period="current_month"
        onClose={vi.fn()}
      />,
    );

    expect(getRecoveryAudit).not.toHaveBeenCalled();
  });
});
