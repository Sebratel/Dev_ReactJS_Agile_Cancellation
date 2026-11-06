export type PaymentPromiseListItemResponse = {
  id: string;
  collectionCaseId: string;
  status: string;
  promisedAmount: string;
  promisedDate: string;
  notes: string | null;
  fulfilledAt: string | null;
  brokenAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  isOverdue: boolean;
  // Situação atual do caso e quando foi regularizado/retido (se foi).
  caseStatus: string;
  caseRecoveredAt: string | null;
  customer: {
    id: string;
    name: string;
    document: string;
  };
  contract: {
    id: string;
    code: string;
    status: string;
  };
  assignedTo: {
    id: string;
    name: string;
  } | null;
};

export type PaymentPromisesSummaryResponse = {
  active: number;
  overdue: number;
  // Dentre as vencidas, as de clientes que já pagaram (caso retido ou pago).
  overduePaid: number;
  fulfilledThisMonth: number;
  brokenThisMonth: number;
};
