// Um caso "some" da regra de elegibilidade do ERP por dois motivos bem
// diferentes: o cliente PAGOU (regularizou) ou o contrato foi CANCELADO/mudou
// de status. A query de títulos em aberto filtra por v_status elegível, então
// um contrato cancelado desaparece mesmo com títulos vencidos — e antes era
// creditado como "recuperado" por engano. Aqui classificamos com base no
// estado REAL do contrato no ERP (status + títulos vencidos em aberto).

export const ERP_ELIGIBLE_CONTRACT_STATUSES = new Set([
  'Bloqueio Financeiro',
  'Normal',
]);

export type ErpContractReconcileStatus = {
  erpContractStatus: string | null;
  openOverdueTitles: number;
};

function isEligibleContractStatus(
  status: ErpContractReconcileStatus,
): boolean {
  return (
    status.erpContractStatus !== null &&
    ERP_ELIGIBLE_CONTRACT_STATUSES.has(status.erpContractStatus)
  );
}

/**
 * Regularizado = o contrato continua num status elegível e não tem mais nenhum
 * título vencido em aberto (por isso saiu da regra). Não basta para creditar
 * receita — ainda exige PROVA de pagamento real (ver resolveReconcileOutcome).
 */
export function isContractRegularized(
  status: ErpContractReconcileStatus | undefined,
): boolean {
  if (!status) {
    return false;
  }

  return isEligibleContractStatus(status) && status.openOverdueTitles === 0;
}

/**
 * Desfecho de um caso que saiu da regra de elegibilidade do ERP:
 * - `paid`: regularizado E com PROVA de pagamento real (client_paid_date).
 * - `cancelled`: contrato com status não elegível (cancelado/encerrado) ou não
 *   encontrado no ERP.
 * - `unresolved`: saiu da regra (sem vencidos) mas SEM pagamento — ex.:
 *   vencimento adiado, título apagado, renegociação (título substituído). NÃO é
 *   recuperação (evita receita falsa) nem cancelamento; o caso não é finalizado.
 *
 * Obs.: renegociação NÃO é mais um desfecho. O flag `renegotiated` do ERP marca
 * títulos substituídos em renegociações antigas (histórico), não "renegociado
 * agora" — usá-lo gerava rótulos falsos. O histórico de renegociações é tratado
 * à parte (relatório via `financial_renegotiations`).
 */
export type ReconcileOutcome = 'paid' | 'cancelled' | 'unresolved';

export function resolveReconcileOutcome(
  status: ErpContractReconcileStatus | undefined,
  hasPaymentEvidence: boolean,
): ReconcileOutcome {
  if (!status || !isEligibleContractStatus(status)) {
    return 'cancelled';
  }

  // Só credita recuperação com regularização E prova de pagamento real.
  if (isContractRegularized(status) && hasPaymentEvidence) {
    return 'paid';
  }

  return 'unresolved';
}

export type ManualAttemptForClassification = {
  collectionCaseId: string;
  attemptedAt: Date;
  // Resultado da tentativa (AttemptResult). Só conta recuperação quando houve
  // CONTATO EFETIVO (abaixo) — "não atendeu"/caixa postal/número errado não
  // comprovam esforço que levou ao pagamento.
  result: string;
};

/**
 * Resultados de tentativa que representam CONTATO EFETIVO com o cliente (o
 * atendente de fato falou/interagiu). Só esses creditam recuperação:
 * - CONTACTED: falou com o cliente
 * - PROMISE_MADE: cliente prometeu pagar
 * - CALLBACK_REQUESTED: cliente pediu retorno (houve interação)
 * - REFUSED: cliente atendeu e se recusou (houve contato)
 * Ficam DE FORA (não creditam): NO_ANSWER, VOICEMAIL, WRONG_NUMBER, OTHER.
 */
export const EFFECTIVE_ATTEMPT_RESULTS = new Set([
  'CONTACTED',
  'PROMISE_MADE',
  'CALLBACK_REQUESTED',
  'REFUSED',
]);

/** Dia (00:00 UTC) de uma data — para comparar contato x pagamento por dia. */
function toDayUtc(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

/**
 * Um caso foi RECUPERADO (esforço de atendente) só se teve ao menos uma
 * tentativa manual com CONTATO EFETIVO (ver EFFECTIVE_ATTEMPT_RESULTS) que:
 *  1. está DENTRO do ciclo atual (`attemptedAt >= cycleStartedAt`) — evita
 *     creditar por tentativas herdadas de um ciclo anterior (caso reaberto);
 *  2. aconteceu ATÉ O DIA do pagamento (`attemptedAt <= dia da baixa`) — evita
 *     creditar quando o cliente já tinha pago sozinho (boleto/Pix) e a ligação
 *     veio depois. Comparação por DIA (contato no mesmo dia da baixa conta).
 * Exigir contato efetivo evita creditar por um simples "não atendeu". Caso sem
 * `cycleStartedAt` (legado) não aplica (1); caso sem data de pagamento conhecida
 * não aplica (2) — mantém o comportamento da Fase 1.
 */
export function resolveRecoveredCaseIds(
  attempts: ManualAttemptForClassification[],
  cycleStartByCase: Map<string, Date | null>,
  paymentDayByCase?: Map<string, Date | null>,
): Set<string> {
  const recovered = new Set<string>();

  for (const attempt of attempts) {
    if (!EFFECTIVE_ATTEMPT_RESULTS.has(attempt.result)) {
      continue;
    }

    const cycleStart = cycleStartByCase.get(attempt.collectionCaseId) ?? null;
    if (cycleStart && attempt.attemptedAt.getTime() < cycleStart.getTime()) {
      continue;
    }

    const paymentDate =
      paymentDayByCase?.get(attempt.collectionCaseId) ?? null;
    if (
      paymentDate &&
      toDayUtc(attempt.attemptedAt) > toDayUtc(paymentDate)
    ) {
      continue;
    }

    recovered.add(attempt.collectionCaseId);
  }

  return recovered;
}
