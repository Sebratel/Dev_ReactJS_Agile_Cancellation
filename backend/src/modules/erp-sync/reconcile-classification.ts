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
  // Houve renegociação no contrato (algum título com renegotiated=true). A
  // renegociação some da visão da plataforma (todas as queries filtram
  // renegotiated=false) e o novo título consolidado costuma ter vencimento
  // futuro — então o contrato "sai da regra" sem que tenha havido pagamento.
  hasRenegotiation: boolean;
  // Saldo em aberto (títulos não renegociados, não pagos, com saldo > 0,
  // qualquer vencimento, fora tarifas de baixa). > 0 = ainda deve.
  openUnpaidBalance: number;
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
 * RENEGOCIAÇÃO (não é pagamento): o contrato continua num status elegível, sem
 * títulos vencidos em aberto (por isso saiu da regra), MAS teve uma
 * renegociação e ainda resta saldo em aberto. É o caso que a cobrança
 * descreveu — renegociam a fatura no ERP e cancelam o contrato depois; antes,
 * isso era creditado como "regularizado" por engano.
 */
export function isContractRenegotiated(
  status: ErpContractReconcileStatus | undefined,
): boolean {
  if (!status) {
    return false;
  }

  return (
    isEligibleContractStatus(status) &&
    status.openOverdueTitles === 0 &&
    status.hasRenegotiation &&
    status.openUnpaidBalance > 0
  );
}

/**
 * Só é regularização (pagamento) quando o contrato continua num status
 * elegível, não tem mais nenhum título vencido em aberto E não é uma
 * renegociação pendente (renegociado com saldo). Qualquer outro caso (status
 * não elegível = cancelado/encerrado, ainda com título vencido, renegociação
 * em aberto, ou contrato não encontrado) NÃO é pagamento.
 */
export function isContractRegularized(
  status: ErpContractReconcileStatus | undefined,
): boolean {
  if (!status) {
    return false;
  }

  return (
    isEligibleContractStatus(status) &&
    status.openOverdueTitles === 0 &&
    !isContractRenegotiated(status)
  );
}

export type ManualAttemptForClassification = {
  collectionCaseId: string;
  attemptedAt: Date;
};

/**
 * Um caso foi RECUPERADO (esforço de atendente) só se teve ao menos uma
 * tentativa manual DENTRO do ciclo atual — ou seja, com `attemptedAt` a partir
 * do `cycleStartedAt` do caso. Isso evita creditar recuperação ao atendente por
 * tentativas herdadas de um ciclo anterior (quando o mesmo caso é reaberto).
 * Caso sem `cycleStartedAt` (dados legados) conta qualquer tentativa manual.
 */
export function resolveRecoveredCaseIds(
  attempts: ManualAttemptForClassification[],
  cycleStartByCase: Map<string, Date | null>,
): Set<string> {
  const recovered = new Set<string>();

  for (const attempt of attempts) {
    const cycleStart = cycleStartByCase.get(attempt.collectionCaseId) ?? null;

    if (!cycleStart || attempt.attemptedAt.getTime() >= cycleStart.getTime()) {
      recovered.add(attempt.collectionCaseId);
    }
  }

  return recovered;
}
