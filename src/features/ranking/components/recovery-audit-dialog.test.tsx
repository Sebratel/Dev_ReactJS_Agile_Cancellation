import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryAuditDialog } from '@/features/ranking/components/recovery-audit-dialog';
import {
  type RecoveryAuditCase,
  type RecoveryAuditResponse,
} from '@/features/ranking/types/ranking-api.types';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/features/ranking/services/ranking.service', () => ({
  getRecoveryRanking: vi.fn(),
  getRecoveryAudit: vi.fn(),
  getCaseRecoveryAudit: vi.fn(),
}));

import { getRecoveryAudit } from '@/features/ranking/services/ranking.service';

function auditCase(
  id: string,
  customer: string,
  overrides: Partial<RecoveryAuditCase> = {},
): RecoveryAuditCase {
  return {
    caseId: id,
    customerName: customer,
    contractCode: '10428',
    recoveredAt: '2026-11-06T09:30:00.000Z',
    recoveredAmount: '139.86',
    assignedTo: { id: 'u1', name: 'Débora' },
    paymentDay: '2026-11-04',
    reactivatedAt: null,
    paymentsAvailable: true,
    payments: [
      {
        titleNumber: '48213',
        paidDate: '2026-11-04',
        registeredAt: '2026-11-04T19:44:00.000Z',
        amount: '99.90',
        receivedAmount: '103.23',
        paymentForm: 'Pix',
        viaRenegotiation: false,
      },
      {
        titleNumber: '17642749',
        paidDate: '2026-11-04',
        registeredAt: '2026-11-04T22:09:00.000Z',
        amount: '39.96',
        receivedAmount: '39.96',
        paymentForm: 'Boleto',
        viaRenegotiation: true,
      },
    ],
    contacts: [
      {
        id: 'a1',
        attemptedAt: '2026-11-03T19:20:00.000Z',
        result: 'CONTACTED',
        channel: 'WHATSAPP',
        notes: 'HSM Matrix solicitado via N8N',
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
        detail: '2 baixa(s)',
      },
      {
        key: 'effective_contact',
        label: 'Contato efetivo registrado no ciclo',
        status: 'ok',
        detail: '1 contato',
      },
      {
        key: 'contact_before_payment',
        label: 'Contato feito até o dia do pagamento',
        status: 'ok',
        detail: 'ok',
      },
      {
        key: 'amount_match',
        label: 'Valor creditado = soma dos títulos pagos',
        status: 'ok',
        detail: 'ok',
      },
      {
        key: 'credit_to_contact_agent',
        label: 'Crédito está com quem fez o contato',
        status: 'ok',
        detail: 'ok',
      },
    ],
    verified: true,
    ...overrides,
  };
}

const audit: RecoveryAuditResponse = {
  periodFrom: '2026-11-01T00:00:00.000Z',
  periodTo: '2026-12-01T00:00:00.000Z',
  user: { id: 'u1', name: 'Débora', avatarUrl: null },
  erpAvailable: true,
  totalAmount: '239.76',
  verifiedCases: 1,
  cases: [
    auditCase('c1', 'ACME LTDA'),
    auditCase('c2', 'BETA SA', {
      recoveredAmount: '99.90',
      verified: false,
      checks: [
        {
          key: 'amount_match',
          label: 'Valor creditado = soma dos títulos pagos',
          status: 'fail',
          detail: 'Os títulos pagos somam R$ 139.86',
        },
      ],
    }),
  ],
};

describe('RecoveryAuditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRecoveryAudit).mockResolvedValue(audit);
  });

  it('abre no centro com a linha do tempo e a receita confirmada', async () => {
    renderWithProviders(
      <RecoveryAuditDialog
        agent={{ userId: 'u1', name: 'Débora' }}
        period="current_month"
        onClose={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/Conferência do crédito/),
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText('Linha do tempo da recuperação'),
    ).toBeInTheDocument();
    expect(screen.getByText('Contato com o cliente')).toBeInTheDocument();
    expect(
      screen.getByText('Pagamento de título renegociado'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Receita confirmada para Débora'),
    ).toBeInTheDocument();
    expect(getRecoveryAudit).toHaveBeenCalledWith('u1', 'current_month');
  });

  it('troca de recuperacao pelas abas e mostra o que nao confere', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <RecoveryAuditDialog
        agent={{ userId: 'u1', name: 'Débora' }}
        period="current_month"
        onClose={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole('tab', { name: /BETA SA/ }));

    expect(
      await screen.findByText(/etapa\(s\) não confirmada\(s\)/),
    ).toBeInTheDocument();
    expect(screen.getByText('Revisar')).toBeInTheDocument();
  });

  it('nao busca nada enquanto nenhum atendente esta selecionado', () => {
    renderWithProviders(
      <RecoveryAuditDialog
        agent={null}
        period="current_month"
        onClose={vi.fn()}
      />,
    );

    expect(getRecoveryAudit).not.toHaveBeenCalled();
  });
});
