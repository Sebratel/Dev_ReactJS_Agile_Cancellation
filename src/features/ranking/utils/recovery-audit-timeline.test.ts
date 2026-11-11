import { describe, expect, it } from 'vitest';
import { type RecoveryAuditCase } from '@/features/ranking/types/ranking-api.types';
import { buildTimelineSteps } from '@/features/ranking/utils/recovery-audit-timeline';

function base(overrides: Partial<RecoveryAuditCase> = {}): RecoveryAuditCase {
  return {
    caseId: 'c1',
    customerName: 'ACME',
    contractCode: '1',
    recoveredAt: '2026-11-06T09:30:00.000Z',
    recoveredAmount: '139.86',
    assignedTo: { id: 'u1', name: 'Débora' },
    paymentDay: '2026-11-04',
    reactivatedAt: null,
    paymentsAvailable: true,
    payments: [
      {
        titleNumber: '1',
        paidDate: '2026-11-04',
        registeredAt: null,
        amount: '99.90',
        receivedAmount: '99.90',
        paymentForm: 'Pix',
        viaRenegotiation: false,
      },
      {
        titleNumber: '2',
        paidDate: '2026-11-04',
        registeredAt: null,
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
        channel: 'PHONE',
        notes: 'Falou com a titular',
        performedBy: { id: 'u1', name: 'Débora' },
        effective: true,
        beforePayment: true,
        credited: true,
      },
      {
        id: 'a0',
        attemptedAt: '2026-11-03T18:04:00.000Z',
        result: 'NO_ANSWER',
        channel: 'PHONE',
        notes: null,
        performedBy: { id: 'u1', name: 'Débora' },
        effective: false,
        beforePayment: true,
        credited: false,
      },
    ],
    checks: [
      { key: 'payment_confirmed', label: 'x', status: 'ok', detail: '' },
      { key: 'effective_contact', label: 'x', status: 'ok', detail: '' },
      { key: 'contact_before_payment', label: 'x', status: 'ok', detail: '' },
      { key: 'amount_match', label: 'x', status: 'ok', detail: '' },
      { key: 'credit_to_contact_agent', label: 'x', status: 'ok', detail: '' },
    ],
    verified: true,
    ...overrides,
  };
}

describe('buildTimelineSteps', () => {
  it('ordem: contato, pagamentos (incluindo renegociado), recuperacao e credito', () => {
    const steps = buildTimelineSteps(base());

    expect(steps.map((s) => s.kind)).toEqual([
      'contact',
      'payment',
      'payment',
      'recovery',
      'result',
    ]);
    expect(steps[2]?.title).toBe('Pagamento de título renegociado');
    expect(steps[0]?.subtitle).toContain('1 outra(s) tentativa(s) não contam');
    expect(steps[4]?.title).toBe('Crédito para Débora');
    expect(steps[4]?.pills.at(-1)?.label).toBe('5 de 5 etapas');
  });

  it('sem contato qualificado a primeira etapa fica como problema', () => {
    const steps = buildTimelineSteps(
      base({
        contacts: [],
        verified: false,
        checks: [
          {
            key: 'effective_contact',
            label: 'x',
            status: 'fail',
            detail: 'Nenhum contato efetivo',
          },
        ],
      }),
    );

    expect(steps[0]?.problem).toBe(true);
    expect(steps[0]?.pills[0]).toMatchObject({
      status: 'fail',
      detail: 'Nenhum contato efetivo',
    });
  });

  it('ERP indisponivel vira etapa de pagamento nao conferida', () => {
    const steps = buildTimelineSteps(
      base({ paymentsAvailable: false, payments: [] }),
    );

    expect(steps[1]).toMatchObject({
      key: 'payment-unavailable',
      problem: true,
    });
  });

  it('cancelado reativado troca o pagamento pela reativacao', () => {
    const steps = buildTimelineSteps(
      base({ reactivatedAt: '2026-11-05', payments: [] }),
    );

    expect(steps[1]?.kind).toBe('reactivation');
    expect(steps[1]?.pills[0]?.label).toBe('Contrato reativado no ERP');
  });
});
