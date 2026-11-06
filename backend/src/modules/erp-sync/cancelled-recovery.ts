import { EFFECTIVE_ATTEMPT_RESULTS } from '@/modules/erp-sync/reconcile-classification';

// Recuperação de clientes cancelados: a supervisão devolve o cliente a uma
// carteira (status CANCELLED_IN_RECOVERY) e ele continua cancelado até o ERP
// mostrar o contrato "Normal" de novo. A receita do atendente exige, além da
// reativação, um contato efetivo COM observação registrado antes dela — e só
// conta o que o cliente efetivamente pagar depois da reativação.

/** Status do contrato no ERP que significa "reativado" (contrato ativo). */
export const ERP_REACTIVATED_CONTRACT_STATUS = 'Normal';

/** Por quanto tempo após a reativação os pagamentos entram na receita. */
export const CANCELLED_RECOVERY_PAYMENT_WINDOW_DAYS = 60;

export type CancelledRecoveryErpState = {
  erpContractStatus: string | null;
  // Data do último evento "Reativação de Contrato" no ERP (pode não existir).
  reactivatedAt: Date | null;
};

export type CancelledRecoveryAttempt = {
  attemptedAt: Date;
  result: string;
  notes: string | null;
  isAutomatic: boolean;
};

export type CancelledRecoveryOutcome =
  // Ainda cancelado (ou sem leitura) no ERP: nada muda.
  | { kind: 'waiting' }
  // Reativado COM contato efetivo + observação antes da reativação.
  | { kind: 'recovered'; reactivatedAt: Date }
  // Reativado SEM contato qualificado antes (voltou sozinho): não credita.
  | { kind: 'reactivated'; reactivatedAt: Date };

function toDayUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Tentativa que comprova o esforço: manual, com contato efetivo, com
 * observação preenchida, dentro do ciclo atual e até o dia da reativação.
 */
export function hasQualifyingRecoveryContact(
  attempts: CancelledRecoveryAttempt[],
  cycleStartedAt: Date | null,
  reactivatedAt: Date,
): boolean {
  return attempts.some((attempt) => {
    if (attempt.isAutomatic || !EFFECTIVE_ATTEMPT_RESULTS.has(attempt.result)) {
      return false;
    }

    if (!attempt.notes?.trim()) {
      return false;
    }

    if (cycleStartedAt && attempt.attemptedAt < cycleStartedAt) {
      return false;
    }

    return toDayUtc(attempt.attemptedAt) <= toDayUtc(reactivatedAt);
  });
}

export function resolveCancelledRecoveryOutcome(input: {
  erp: CancelledRecoveryErpState | undefined;
  cycleStartedAt: Date | null;
  attempts: CancelledRecoveryAttempt[];
  now: Date;
}): CancelledRecoveryOutcome {
  const { erp, cycleStartedAt, attempts, now } = input;

  if (!erp || erp.erpContractStatus !== ERP_REACTIVATED_CONTRACT_STATUS) {
    return { kind: 'waiting' };
  }

  // Sem evento de reativação legível, usa o momento da detecção (conservador:
  // só contatos até hoje contam).
  const reactivatedAt = erp.reactivatedAt ?? now;

  return hasQualifyingRecoveryContact(attempts, cycleStartedAt, reactivatedAt)
    ? { kind: 'recovered', reactivatedAt }
    : { kind: 'reactivated', reactivatedAt };
}
