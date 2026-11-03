export type PaymentPromiseStatus =
  | 'ACTIVE'
  | 'FULFILLED'
  | 'BROKEN'
  | 'CANCELLED';

export type PaymentPromiseListItemResponse = {
  id: string;
  collectionCaseId: string;
  status: PaymentPromiseStatus;
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

export type PaymentPromisesListParams = {
  status?: PaymentPromiseStatus | '';
  from?: string;
  to?: string;
  assignedUserId?: string;
  search?: string;
  page?: number;
  limit?: number;
};
