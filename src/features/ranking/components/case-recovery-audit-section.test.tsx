import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaseRecoveryAuditSection } from '@/features/ranking/components/case-recovery-audit-section';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/features/ranking/services/ranking.service', () => ({
  getRecoveryRanking: vi.fn(),
  getRecoveryAudit: vi.fn(),
  getCaseRecoveryAudit: vi.fn(),
}));

import { getCaseRecoveryAudit } from '@/features/ranking/services/ranking.service';

describe('CaseRecoveryAuditSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCaseRecoveryAudit).mockResolvedValue({
      erpAvailable: true,
      audit: {
        caseId: 'c1',
        customerName: 'ACME LTDA',
        contractCode: '10428',
        recoveredAt: '2026-11-04T19:50:00.000Z',
        recoveredAmount: '99.90',
        assignedTo: { id: 'u1', name: 'Débora' },
        paymentDay: '2026-11-04',
        reactivatedAt: null,
        paymentsAvailable: true,
        payments: [],
        contacts: [],
        checks: [
          {
            key: 'payment_confirmed',
            label: 'Pagamento confirmado no ERP',
            status: 'ok',
            detail: '1 baixa(s)',
          },
        ],
        verified: true,
      },
    });
  });

  it('mostra as verificacoes do caso recuperado', async () => {
    renderWithProviders(<CaseRecoveryAuditSection caseId="c1" enabled />);

    expect(
      await screen.findByText('Conferência do crédito'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Pagamento confirmado no ERP'),
    ).toBeInTheDocument();
    expect(getCaseRecoveryAudit).toHaveBeenCalledWith('c1');
  });

  it('nao renderiza nem busca quando desabilitado (nao e supervisao ou nao recuperado)', () => {
    renderWithProviders(
      <CaseRecoveryAuditSection caseId="c1" enabled={false} />,
    );

    expect(screen.queryByText('Conferência do crédito')).toBeNull();
    expect(getCaseRecoveryAudit).not.toHaveBeenCalled();
  });
});
