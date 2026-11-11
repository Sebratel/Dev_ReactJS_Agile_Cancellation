import { getAttemptResultLabel } from '@/features/collection-cases/utils/collection-case-labels';
import {
  type RecoveryAuditCase,
  type RecoveryAuditCheck,
  type RecoveryAuditCheckStatus,
} from '@/features/ranking/types/ranking-api.types';
import {
  formatCurrencyFromDecimalString,
  formatDateOnlyPtBR,
  formatDateTimePtBR,
} from '@/utils/formatters';

export type TimelineStepKind =
  | 'contact'
  | 'payment'
  | 'reactivation'
  | 'recovery'
  | 'result';

export type TimelinePill = {
  label: string;
  status: RecoveryAuditCheckStatus;
  // Mostrado sob a etiqueta quando a etapa não confere (ou não foi conferida).
  detail: string | null;
};

export type TimelineStep = {
  key: string;
  kind: TimelineStepKind;
  when: string | null;
  title: string;
  subtitle: string | null;
  note: string | null;
  pills: TimelinePill[];
  // Etapa que merece atenção (algo não confere).
  problem: boolean;
};

const PILL_LABELS: Record<string, string> = {
  payment_confirmed: 'Baixa confirmada no ERP',
  effective_contact: 'Contato efetivo registrado',
  contact_before_payment: 'Contato antes do pagamento',
  amount_match: 'Valor = soma dos títulos pagos',
  credit_to_contact_agent: 'Crédito com quem fez o contato',
};

const REACTIVATION_PILL_LABELS: Record<string, string> = {
  payment_confirmed: 'Contrato reativado no ERP',
  contact_before_payment: 'Contato com observação antes da reativação',
  amount_match: 'Valor pago após a reativação',
};

function pillFor(
  item: RecoveryAuditCase,
  checks: RecoveryAuditCheck[],
  key: string,
): TimelinePill | null {
  const check = checks.find((entry) => entry.key === key);

  if (!check) {
    return null;
  }

  const labels = item.reactivatedAt
    ? { ...PILL_LABELS, ...REACTIVATION_PILL_LABELS }
    : PILL_LABELS;

  return {
    label: labels[key] ?? check.label,
    status: check.status,
    detail: check.status === 'ok' ? null : check.detail,
  };
}

function compact<T>(values: Array<T | null>): T[] {
  return values.filter((value): value is T => value !== null);
}

function truncate(text: string | null, max = 90): string | null {
  if (!text) {
    return null;
  }

  const trimmed = text.trim();

  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

// Monta as etapas da linha do tempo na ordem lógica da conferência:
// contato → pagamento (ou reativação) → recuperação registrada → crédito.
export function buildTimelineSteps(item: RecoveryAuditCase): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // 1. Contato que sustenta o crédito.
  const credited = item.contacts.find((contact) => contact.credited) ?? null;
  const ignoredAttempts = item.contacts.filter(
    (contact) => !contact.credited,
  ).length;
  const contactPill = pillFor(item, item.checks, 'effective_contact');

  steps.push({
    key: 'contact',
    kind: 'contact',
    when: credited ? formatDateTimePtBR(credited.attemptedAt) : null,
    title: credited ? 'Contato com o cliente' : 'Sem contato qualificado',
    subtitle: credited
      ? `${credited.performedBy?.name ?? 'Usuário removido'} · ${getAttemptResultLabel(credited.result)}`
      : null,
    note: truncate(credited?.notes ?? null),
    pills: compact([contactPill]),
    problem: !credited,
  });

  if (ignoredAttempts > 0 && credited) {
    const last = steps[steps.length - 1];
    if (last) {
      last.subtitle = `${last.subtitle ?? ''}${last.subtitle ? ' · ' : ''}${ignoredAttempts} outra(s) tentativa(s) não contam`;
    }
  }

  // 2. Pagamento(s) no ERP — ou a reativação, no caso de cancelado.
  const beforePaymentPill = pillFor(
    item,
    item.checks,
    'contact_before_payment',
  );
  const confirmedPill = pillFor(item, item.checks, 'payment_confirmed');

  if (item.reactivatedAt) {
    steps.push({
      key: 'reactivation',
      kind: 'reactivation',
      when: formatDateOnlyPtBR(item.reactivatedAt),
      title: 'Contrato reativado no ERP',
      subtitle: null,
      note: null,
      pills: compact([confirmedPill, beforePaymentPill]),
      problem: false,
    });
  } else if (!item.paymentsAvailable) {
    steps.push({
      key: 'payment-unavailable',
      kind: 'payment',
      when: null,
      title: 'Pagamento no ERP',
      subtitle: 'ERP indisponível agora',
      note: null,
      pills: compact([confirmedPill, beforePaymentPill]),
      problem: true,
    });
  } else if (item.payments.length === 0) {
    steps.push({
      key: 'payment-missing',
      kind: 'payment',
      when: null,
      title: 'Pagamento no ERP',
      subtitle: 'Nenhuma baixa encontrada',
      note: null,
      pills: compact([confirmedPill, beforePaymentPill]),
      problem: true,
    });
  } else {
    [...item.payments]
      .sort((a, b) => a.paidDate.localeCompare(b.paidDate))
      .forEach((payment, index) => {
        const registered = payment.registeredAt
          ? ` · lançada ${formatDateTimePtBR(payment.registeredAt)}`
          : '';

        steps.push({
          key: `payment-${index}`,
          kind: 'payment',
          when: `${formatDateOnlyPtBR(payment.paidDate) ?? payment.paidDate}${registered}`,
          title: payment.viaRenegotiation
            ? 'Pagamento de título renegociado'
            : 'Pagamento no ERP',
          subtitle: `${formatCurrencyFromDecimalString(payment.amount)}${payment.paymentForm ? ` · ${payment.paymentForm}` : ''}`,
          note: payment.viaRenegotiation
            ? 'Título gerado pela renegociação'
            : null,
          // As verificações do pagamento ficam na primeira baixa.
          pills: index === 0 ? compact([confirmedPill, beforePaymentPill]) : [],
          problem: false,
        });
      });
  }

  // 3. Recuperação registrada pela plataforma.
  steps.push({
    key: 'recovery',
    kind: 'recovery',
    when: formatDateTimePtBR(item.recoveredAt),
    title: 'Recuperação registrada',
    subtitle: `Receita ${formatCurrencyFromDecimalString(item.recoveredAmount)}`,
    note: null,
    pills: compact([pillFor(item, item.checks, 'amount_match')]),
    problem: false,
  });

  // 4. Resultado: para quem foi o crédito.
  const okCount = item.checks.filter((check) => check.status === 'ok').length;
  steps.push({
    key: 'result',
    kind: 'result',
    when: null,
    title: `Crédito para ${item.assignedTo?.name ?? 'ninguém'}`,
    subtitle: 'Atendente responsável',
    note: null,
    pills: compact([
      pillFor(item, item.checks, 'credit_to_contact_agent'),
      {
        label: `${okCount} de ${item.checks.length} etapas`,
        status: item.verified ? 'ok' : 'unknown',
        detail: null,
      },
    ]),
    problem: !item.verified,
  });

  return steps;
}
