import { EFFECTIVE_ATTEMPT_RESULTS } from '@/modules/erp-sync/reconcile-classification';

// Detalhamento (para a supervisão) de COMO cada recuperação chegou ao valor
// creditado no ranking: o pagamento no ERP, os contatos da atendente e as
// verificações que sustentam o crédito. Funções puras, sem acesso a banco.

export type RecoveryAuditAttemptInput = {
  id: string;
  attemptedAt: Date;
  result: string;
  channel: string;
  notes: string | null;
  performedBy: { id: string; name: string } | null;
};

export type RecoveryAuditPaymentInput = {
  titleNumber: string | null;
  // Dia da baixa no ERP (client_paid_date é só data, sem hora).
  paidDate: Date;
  // Quando a baixa foi lançada no ERP (timestamp de criação do recebimento).
  registeredAt: Date | null;
  // Valor do título pago: é o que entra no crédito do ranking.
  amount: number;
  // Valor efetivamente recebido na baixa (pode diferir por multa/desconto).
  receivedAmount: number;
  paymentForm: string | null;
};

export type RecoveryAuditCaseInput = {
  caseId: string;
  customerName: string;
  contractCode: string;
  recoveredAt: Date;
  recoveredAmount: number;
  cycleStartedAt: Date | null;
  assignedUser: { id: string; name: string } | null;
  // Cliente cancelado devolvido à carteira e reativado: o crédito é pelo pago
  // DEPOIS da reativação (não por título-gatilho), e o contato precisa de
  // observação e ser até o dia da reativação.
  reactivatedAt?: Date | null;
  attempts: RecoveryAuditAttemptInput[];
  // null = ERP indisponível (não foi possível confirmar o pagamento agora).
  payments: RecoveryAuditPaymentInput[] | null;
};

export type RecoveryAuditCheckStatus = 'ok' | 'fail' | 'unknown';

export type RecoveryAuditCheck = {
  key:
    | 'payment_confirmed'
    | 'effective_contact'
    | 'contact_before_payment'
    | 'amount_match'
    | 'credit_to_contact_agent';
  label: string;
  status: RecoveryAuditCheckStatus;
  detail: string;
};

export type RecoveryAuditContact = {
  id: string;
  attemptedAt: string;
  result: string;
  channel: string;
  notes: string | null;
  performedBy: { id: string; name: string } | null;
  effective: boolean;
  // Contato efetivo feito até o dia do pagamento (conta para o crédito).
  beforePayment: boolean | null;
  // É o contato que sustenta o crédito (último efetivo até o dia do pagamento).
  credited: boolean;
};

export type RecoveryAuditPayment = {
  titleNumber: string | null;
  paidDate: string;
  registeredAt: string | null;
  amount: string;
  receivedAmount: string;
  paymentForm: string | null;
};

export type RecoveryAuditCase = {
  caseId: string;
  customerName: string;
  contractCode: string;
  recoveredAt: string;
  recoveredAmount: string;
  assignedTo: { id: string; name: string } | null;
  paymentDay: string | null;
  reactivatedAt: string | null;
  payments: RecoveryAuditPayment[];
  paymentsAvailable: boolean;
  contacts: RecoveryAuditContact[];
  checks: RecoveryAuditCheck[];
  // Todas as verificações passaram.
  verified: boolean;
};

function toDayUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// dd/mm/aaaa para os textos das verificações (dia calendário em UTC, como as
// datas de baixa do ERP).
function formatDayBr(date: Date): string {
  const [year, month, day] = formatDay(date).split('-');
  return `${day}/${month}/${year}`;
}

function brl(value: number): string {
  return value.toFixed(2);
}

export function buildRecoveryAuditCase(
  input: RecoveryAuditCaseInput,
): RecoveryAuditCase {
  const payments = input.payments;
  const paymentsAvailable = payments !== null;
  const paidPayments = payments ?? [];

  // Dia do pagamento = menor data de baixa entre os títulos pagos.
  const paymentDay =
    paidPayments.length > 0
      ? new Date(Math.min(...paidPayments.map((p) => p.paidDate.getTime())))
      : null;
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  // Só tentativas manuais do ciclo atual entram na conta do crédito.
  const manualInCycle = input.attempts
    .filter(
      (attempt) =>
        !input.cycleStartedAt ||
        attempt.attemptedAt.getTime() >= input.cycleStartedAt.getTime(),
    )
    .sort((a, b) => a.attemptedAt.getTime() - b.attemptedAt.getTime());

  const isEffective = (attempt: RecoveryAuditAttemptInput) =>
    EFFECTIVE_ATTEMPT_RESULTS.has(attempt.result);
  const reactivatedAt = input.reactivatedAt ?? null;
  // Dia de corte do contato: o pagamento (cobrança) ou a reativação (cancelado).
  const anchorDay = reactivatedAt ?? paymentDay;
  const beforePayment = (attempt: RecoveryAuditAttemptInput): boolean | null =>
    anchorDay ? toDayUtc(attempt.attemptedAt) <= toDayUtc(anchorDay) : null;
  const hasNotes = (attempt: RecoveryAuditAttemptInput) =>
    Boolean(attempt.notes && attempt.notes.trim().length > 0);

  const qualifying = manualInCycle.filter(
    (attempt) =>
      isEffective(attempt) &&
      beforePayment(attempt) !== false &&
      (!reactivatedAt || hasNotes(attempt)),
  );
  const credited =
    qualifying.length > 0 ? qualifying[qualifying.length - 1] : null;

  const contacts: RecoveryAuditContact[] = manualInCycle.map((attempt) => ({
    id: attempt.id,
    attemptedAt: attempt.attemptedAt.toISOString(),
    result: attempt.result,
    channel: attempt.channel,
    notes: attempt.notes,
    performedBy: attempt.performedBy,
    effective: isEffective(attempt),
    beforePayment: beforePayment(attempt),
    credited: credited?.id === attempt.id,
  }));

  const effectiveCount = manualInCycle.filter(isEffective).length;

  const paymentChecks: RecoveryAuditCheck[] = [];

  // 1. Pagamento confirmado no ERP (baixa real, com forma de pagamento).
  if (!paymentsAvailable) {
    paymentChecks.push({
      key: 'payment_confirmed',
      label: 'Pagamento confirmado no ERP',
      status: 'unknown',
      detail:
        'ERP indisponível agora — não foi possível reconferir o pagamento.',
    });
  } else if (paidPayments.length === 0) {
    paymentChecks.push({
      key: 'payment_confirmed',
      label: 'Pagamento confirmado no ERP',
      status: 'fail',
      detail: 'Nenhuma baixa com forma de pagamento encontrada no ERP.',
    });
  } else {
    const forms = [
      ...new Set(
        paidPayments.map((p) => p.paymentForm).filter((f): f is string => !!f),
      ),
    ];
    paymentChecks.push({
      key: 'payment_confirmed',
      label: 'Pagamento confirmado no ERP',
      status: 'ok',
      detail: `${paidPayments.length} baixa(s), primeira em ${formatDayBr(paymentDay as Date)}${forms.length > 0 ? ` (${forms.join(', ')})` : ''}.`,
    });
  }

  // 2. Houve contato efetivo no ciclo atual.
  paymentChecks.push(
    effectiveCount > 0
      ? {
          key: 'effective_contact',
          label: 'Contato efetivo registrado no ciclo',
          status: 'ok',
          detail: `${effectiveCount} contato(s) efetivo(s) registrado(s) pela atendente.`,
        }
      : {
          key: 'effective_contact',
          label: 'Contato efetivo registrado no ciclo',
          status: 'fail',
          detail: 'Nenhum contato efetivo (falou com o cliente) no ciclo.',
        },
  );

  // 3. Contato efetivo feito ATÉ o dia do pagamento.
  if (!paymentDay) {
    paymentChecks.push({
      key: 'contact_before_payment',
      label: 'Contato feito até o dia do pagamento',
      status: 'unknown',
      detail: 'Sem a data da baixa não dá para comparar com o contato.',
    });
  } else if (credited) {
    paymentChecks.push({
      key: 'contact_before_payment',
      label: 'Contato feito até o dia do pagamento',
      status: 'ok',
      detail: `Contato efetivo em ${formatDayBr(credited.attemptedAt)}, pagamento em ${formatDayBr(paymentDay)}.`,
    });
  } else {
    paymentChecks.push({
      key: 'contact_before_payment',
      label: 'Contato feito até o dia do pagamento',
      status: 'fail',
      detail: `Nenhum contato efetivo até ${formatDayBr(paymentDay)}.`,
    });
  }

  // 4. O valor creditado é a soma das baixas.
  if (!paymentsAvailable || paidPayments.length === 0) {
    paymentChecks.push({
      key: 'amount_match',
      label: 'Valor creditado = soma dos títulos pagos',
      status: 'unknown',
      detail: 'Sem baixas para somar.',
    });
  } else if (Math.abs(totalPaid - input.recoveredAmount) < 0.01) {
    paymentChecks.push({
      key: 'amount_match',
      label: 'Valor creditado = soma dos títulos pagos',
      status: 'ok',
      detail: `R$ ${brl(totalPaid)} nos títulos pagos e R$ ${brl(input.recoveredAmount)} creditados.`,
    });
  } else {
    paymentChecks.push({
      key: 'amount_match',
      label: 'Valor creditado = soma dos títulos pagos',
      status: 'fail',
      detail: `Os títulos pagos somam R$ ${brl(totalPaid)}, mas o crédito é R$ ${brl(input.recoveredAmount)}.`,
    });
  }

  // 5. Quem recebe o crédito é quem fez o contato.
  if (!credited) {
    paymentChecks.push({
      key: 'credit_to_contact_agent',
      label: 'Crédito está com quem fez o contato',
      status: 'unknown',
      detail: 'Sem contato qualificado para comparar.',
    });
  } else if (credited.performedBy?.id === input.assignedUser?.id) {
    paymentChecks.push({
      key: 'credit_to_contact_agent',
      label: 'Crédito está com quem fez o contato',
      status: 'ok',
      detail: `Contato e crédito são de ${input.assignedUser?.name ?? '—'}.`,
    });
  } else {
    paymentChecks.push({
      key: 'credit_to_contact_agent',
      label: 'Crédito está com quem fez o contato',
      status: 'fail',
      detail: `O último contato foi de ${credited.performedBy?.name ?? 'usuário removido'}, mas o crédito está com ${input.assignedUser?.name ?? 'ninguém'}.`,
    });
  }

  const checks: RecoveryAuditCheck[] = [];
  // Cancelado reativado: as verificações de título/baixa não se aplicam.
  if (reactivatedAt) {
    checks.push(
      {
        key: 'payment_confirmed',
        label: 'Contrato reativado no ERP',
        status: 'ok',
        detail: `Reativação em ${formatDayBr(reactivatedAt)}.`,
      },
      {
        key: 'effective_contact',
        label: 'Contato efetivo registrado no ciclo',
        status: effectiveCount > 0 ? 'ok' : 'fail',
        detail:
          effectiveCount > 0
            ? `${effectiveCount} contato(s) efetivo(s) registrado(s) pela atendente.`
            : 'Nenhum contato efetivo (falou com o cliente) no ciclo.',
      },
      {
        key: 'contact_before_payment',
        label: 'Contato com observação até o dia da reativação',
        status: credited ? 'ok' : 'fail',
        detail: credited
          ? `Contato efetivo com observação em ${formatDayBr(credited.attemptedAt)}, reativação em ${formatDayBr(reactivatedAt)}.`
          : `Nenhum contato efetivo com observação até ${formatDayBr(reactivatedAt)}.`,
      },
      {
        key: 'amount_match',
        label: 'Valor creditado = pago após a reativação',
        status: 'unknown',
        detail:
          'Valor recalculado do ERP a cada rodada (pagamentos desde a reativação); não reconferido aqui.',
      },
    );
    if (!credited) {
      checks.push({
        key: 'credit_to_contact_agent',
        label: 'Crédito está com quem fez o contato',
        status: 'unknown',
        detail: 'Sem contato qualificado para comparar.',
      });
    } else if (credited.performedBy?.id === input.assignedUser?.id) {
      checks.push({
        key: 'credit_to_contact_agent',
        label: 'Crédito está com quem fez o contato',
        status: 'ok',
        detail: `Contato e crédito são de ${input.assignedUser?.name ?? '—'}.`,
      });
    } else {
      checks.push({
        key: 'credit_to_contact_agent',
        label: 'Crédito está com quem fez o contato',
        status: 'fail',
        detail: `O último contato foi de ${credited.performedBy?.name ?? 'usuário removido'}, mas o crédito está com ${input.assignedUser?.name ?? 'ninguém'}.`,
      });
    }
  } else {
    checks.push(...paymentChecks);
  }

  return {
    caseId: input.caseId,
    customerName: input.customerName,
    contractCode: input.contractCode,
    recoveredAt: input.recoveredAt.toISOString(),
    recoveredAmount: brl(input.recoveredAmount),
    assignedTo: input.assignedUser,
    paymentDay: paymentDay ? formatDay(paymentDay) : null,
    reactivatedAt: reactivatedAt ? formatDay(reactivatedAt) : null,
    payments: paidPayments.map((p) => ({
      titleNumber: p.titleNumber,
      paidDate: formatDay(p.paidDate),
      registeredAt: p.registeredAt ? p.registeredAt.toISOString() : null,
      amount: brl(p.amount),
      receivedAmount: brl(p.receivedAmount),
      paymentForm: p.paymentForm,
    })),
    paymentsAvailable,
    contacts,
    checks,
    verified: checks.every((check) => check.status === 'ok'),
  };
}

export type RecoveryAuditResponse = {
  periodFrom: string;
  periodTo: string;
  user: { id: string; name: string; avatarUrl: string | null } | null;
  // false = o ERP não respondeu: pagamentos não foram reconferidos.
  erpAvailable: boolean;
  totalAmount: string;
  verifiedCases: number;
  cases: RecoveryAuditCase[];
};

// Exemplo para o modo mock: um caso totalmente verificado, um com contato
// depois do pagamento (reprovado) e um sem confirmação do ERP.
export function buildMockRecoveryAudit(
  userId: string,
  from: Date,
  to: Date,
): RecoveryAuditResponse {
  const agent = { id: userId, name: 'Atendente (exemplo)' };
  const day = (iso: string) => new Date(iso);
  const attempt = (
    id: string,
    at: string,
    result: string,
    notes: string | null,
  ): RecoveryAuditAttemptInput => ({
    id,
    attemptedAt: day(at),
    result,
    channel: 'PHONE',
    notes,
    performedBy: agent,
  });

  const cases = [
    buildRecoveryAuditCase({
      caseId: 'mock_case_1',
      customerName: 'CLIENTE EXEMPLO A',
      contractCode: '10428',
      recoveredAt: day('2026-11-04T19:50:00.000Z'),
      recoveredAmount: 99.9,
      cycleStartedAt: day('2026-10-20T00:00:00.000Z'),
      assignedUser: agent,
      attempts: [
        attempt('a1', '2026-11-03T21:04:00.000Z', 'NO_ANSWER', null),
        attempt(
          'a2',
          '2026-11-04T16:08:00.000Z',
          'PROMISE_MADE',
          'Cliente prometeu pagar via Pix ainda hoje.',
        ),
      ],
      payments: [
        {
          titleNumber: '48213',
          paidDate: day('2026-11-04T00:00:00.000Z'),
          registeredAt: day('2026-11-04T19:40:00.000Z'),
          amount: 99.9,
          receivedAmount: 99.9,
          paymentForm: 'PIX',
        },
      ],
    }),
    buildRecoveryAuditCase({
      caseId: 'mock_case_2',
      customerName: 'CLIENTE EXEMPLO B',
      contractCode: '10431',
      recoveredAt: day('2026-11-06T09:30:00.000Z'),
      recoveredAmount: 199.8,
      cycleStartedAt: day('2026-10-25T00:00:00.000Z'),
      assignedUser: agent,
      attempts: [
        attempt('b1', '2026-11-07T10:00:00.000Z', 'CONTACTED', 'Ligou depois.'),
      ],
      payments: [
        {
          titleNumber: '48307',
          paidDate: day('2026-11-05T00:00:00.000Z'),
          registeredAt: day('2026-11-05T11:15:00.000Z'),
          amount: 199.8,
          receivedAmount: 199.8,
          paymentForm: 'Boleto',
        },
      ],
    }),
    buildRecoveryAuditCase({
      caseId: 'mock_case_3',
      customerName: 'CLIENTE EXEMPLO C',
      contractCode: '10440',
      recoveredAt: day('2026-11-08T12:00:00.000Z'),
      recoveredAmount: 149.9,
      cycleStartedAt: null,
      assignedUser: agent,
      attempts: [
        attempt(
          'c1',
          '2026-11-07T15:30:00.000Z',
          'CONTACTED',
          'Falou com a titular.',
        ),
      ],
      payments: null,
    }),
  ];

  return {
    periodFrom: from.toISOString(),
    periodTo: to.toISOString(),
    user: { ...agent, avatarUrl: null },
    erpAvailable: true,
    totalAmount: cases
      .reduce((sum, item) => sum + Number(item.recoveredAmount), 0)
      .toFixed(2),
    verifiedCases: cases.filter((item) => item.verified).length,
    cases,
  };
}
