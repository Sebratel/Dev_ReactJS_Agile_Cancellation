export type PaymentPromiseResponse = {
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
  createdByUserId: string | null;
};
