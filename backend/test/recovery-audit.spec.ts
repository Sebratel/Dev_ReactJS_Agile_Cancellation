import {
  buildRecoveryAuditCase,
  type RecoveryAuditAttemptInput,
  type RecoveryAuditCaseInput,
} from '@/modules/erp-sync/recovery-audit';

const AGENT = { id: 'u1', name: 'Débora' };
const OTHER = { id: 'u2', name: 'Bianca' };

function attempt(
  id: string,
  at: string,
  result: string,
  by: { id: string; name: string } | null = AGENT,
): RecoveryAuditAttemptInput {
  return {
    id,
    attemptedAt: new Date(at),
    result,
    channel: 'PHONE',
    notes: null,
    performedBy: by,
  };
}

function build(
  overrides: Partial<RecoveryAuditCaseInput> = {},
): ReturnType<typeof buildRecoveryAuditCase> {
  return buildRecoveryAuditCase({
    caseId: 'c1',
    customerName: 'ACME',
    contractCode: '100',
    recoveredAt: new Date('2026-11-04T19:50:00.000Z'),
    recoveredAmount: 99.9,
    cycleStartedAt: new Date('2026-10-20T00:00:00.000Z'),
    assignedUser: AGENT,
    attempts: [attempt('a1', '2026-11-04T16:08:00.000Z', 'PROMISE_MADE')],
    payments: [
      {
        titleNumber: '1',
        paidDate: new Date('2026-11-04T00:00:00.000Z'),
        registeredAt: new Date('2026-11-04T19:40:00.000Z'),
        amount: 99.9,
        receivedAmount: 99.9,
        paymentForm: 'PIX',
      },
    ],
    ...overrides,
  });
}

const status = (
  result: ReturnType<typeof buildRecoveryAuditCase>,
  key: string,
) => result.checks.find((check) => check.key === key)?.status;

describe('buildRecoveryAuditCase', () => {
  it('caso completo: contato efetivo no dia do pagamento passa em tudo', () => {
    const result = build();

    expect(result.verified).toBe(true);
    expect(result.checks.map((c) => c.status)).toEqual([
      'ok',
      'ok',
      'ok',
      'ok',
      'ok',
    ]);
    expect(result.paymentDay).toBe('2026-11-04');
    expect(result.contacts[0]).toMatchObject({
      credited: true,
      effective: true,
      beforePayment: true,
    });
  });

  it('contato depois do dia do pagamento nao sustenta o credito', () => {
    const result = build({
      attempts: [attempt('a1', '2026-11-06T10:00:00.000Z', 'CONTACTED')],
    });

    expect(status(result, 'effective_contact')).toBe('ok');
    expect(status(result, 'contact_before_payment')).toBe('fail');
    expect(status(result, 'credit_to_contact_agent')).toBe('unknown');
    expect(result.verified).toBe(false);
    expect(result.contacts[0]?.credited).toBe(false);
    expect(result.contacts[0]?.beforePayment).toBe(false);
  });

  it('"nao atendeu" nao conta como contato efetivo', () => {
    const result = build({
      attempts: [attempt('a1', '2026-11-03T10:00:00.000Z', 'NO_ANSWER')],
    });

    expect(status(result, 'effective_contact')).toBe('fail');
    expect(result.verified).toBe(false);
  });

  it('ignora tentativas de um ciclo anterior', () => {
    const result = build({
      cycleStartedAt: new Date('2026-11-01T00:00:00.000Z'),
      attempts: [attempt('old', '2026-10-25T10:00:00.000Z', 'CONTACTED')],
    });

    expect(result.contacts).toHaveLength(0);
    expect(status(result, 'effective_contact')).toBe('fail');
  });

  it('credito vai para o ultimo contato efetivo ate o dia do pagamento', () => {
    const result = build({
      attempts: [
        attempt('a1', '2026-11-02T10:00:00.000Z', 'CONTACTED', OTHER),
        attempt('a2', '2026-11-04T09:00:00.000Z', 'PROMISE_MADE', AGENT),
      ],
    });

    expect(result.contacts.find((c) => c.id === 'a2')?.credited).toBe(true);
    expect(result.contacts.find((c) => c.id === 'a1')?.credited).toBe(false);
    expect(status(result, 'credit_to_contact_agent')).toBe('ok');
  });

  it('alerta quando o credito esta com quem nao fez o ultimo contato', () => {
    const result = build({
      assignedUser: OTHER,
      attempts: [attempt('a1', '2026-11-04T09:00:00.000Z', 'CONTACTED', AGENT)],
    });

    expect(status(result, 'credit_to_contact_agent')).toBe('fail');
    expect(result.verified).toBe(false);
  });

  it('valor creditado diferente da soma dos titulos pagos reprova', () => {
    const result = build({ recoveredAmount: 150 });

    expect(status(result, 'amount_match')).toBe('fail');
    expect(result.verified).toBe(false);
  });

  it('sem baixa com forma de pagamento reprova a confirmacao', () => {
    const result = build({ payments: [] });

    expect(status(result, 'payment_confirmed')).toBe('fail');
    expect(status(result, 'contact_before_payment')).toBe('unknown');
    expect(result.verified).toBe(false);
  });

  it('ERP indisponivel marca como nao conferido, nunca como ok', () => {
    const result = build({ payments: null });

    expect(result.paymentsAvailable).toBe(false);
    expect(status(result, 'payment_confirmed')).toBe('unknown');
    expect(status(result, 'amount_match')).toBe('unknown');
    expect(result.verified).toBe(false);
  });
});
