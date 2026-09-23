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

/**
 * Só é regularização (pagamento) quando o contrato continua num status
 * elegível E não tem mais nenhum título vencido em aberto. Qualquer outro caso
 * (status não elegível = cancelado/encerrado, ou ainda com título vencido, ou
 * contrato não encontrado) NÃO é pagamento.
 */
export function isContractRegularized(
  status: ErpContractReconcileStatus | undefined,
): boolean {
  if (!status) {
    return false;
  }

  return (
    status.openOverdueTitles === 0 &&
    status.erpContractStatus !== null &&
    ERP_ELIGIBLE_CONTRACT_STATUSES.has(status.erpContractStatus)
  );
}
