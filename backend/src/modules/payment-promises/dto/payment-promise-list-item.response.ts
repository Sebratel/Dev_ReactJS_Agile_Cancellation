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
  fulfilledThisMonth: number;
  brokenThisMonth: number;
};
