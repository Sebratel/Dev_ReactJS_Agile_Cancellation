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
  // true se o caso está, neste momento, com status RENEGOTIATED.
  isCurrentlyRenegotiated: boolean;
  outstandingAmount: string;
  assignedToName: string | null;
};

export type RenegotiatedHistorySummary = {
  totalCases: number;
  totalRenegotiations: number;
  currentlyRenegotiated: number;
  totalOutstanding: string;
};

export type RenegotiatedHistoryResponse = {
  items: RenegotiatedHistoryItem[];
  summary: RenegotiatedHistorySummary;
};
