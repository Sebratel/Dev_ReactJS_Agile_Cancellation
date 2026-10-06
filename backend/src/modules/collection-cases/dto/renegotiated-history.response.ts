// Histórico de renegociações: um item por caso que já teve ao menos uma
// renegociação registrada na trilha de auditoria (mesmo que depois tenha
// mudado de status — cancelado, reaberto etc.).
export type RenegotiatedHistoryItem = {
  caseId: string;
  customerName: string;
  customerDocument: string;
  contractCode: string | null;
  contractExternalId: string | null;
  // Quantas vezes o caso foi renegociado ao longo do tempo.
  renegotiationCount: number;
  firstRenegotiatedAt: string;
  lastRenegotiatedAt: string;
  currentStatus: string;
  // true se o contrato tem renegociação EM ABERTO hoje: existe um título gerado
  // por renegociação (ainda não consumido de novo) com saldo > 0 e sem baixa
  // real (pagamento com forma). Renegociou e ainda não quitou.
  isCurrentlyRenegotiated: boolean;
  // Saldo da renegociação em aberto no ERP (0.00 se já quitou/nada em aberto).
  openRenegotiationAmount: string;
  outstandingAmount: string;
  assignedToName: string | null;
};

export type RenegotiatedHistorySummary = {
  totalCases: number;
  totalRenegotiations: number;
  // Quantos contratos têm renegociação EM ABERTO (saldo renegociado > 0).
  currentlyRenegotiated: number;
  // Soma dos saldos de renegociação em aberto.
  openRenegotiationTotal: string;
  totalOutstanding: string;
};

export type RenegotiatedHistoryResponse = {
  items: RenegotiatedHistoryItem[];
  summary: RenegotiatedHistorySummary;
};
