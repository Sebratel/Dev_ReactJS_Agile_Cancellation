export type CollectionCasesSortBy =
  | 'daysOverdue'
  | 'totalOutstanding'
  | 'slaDueAt'
  | 'createdAt';

export type CollectionCasesSortDirection = 'asc' | 'desc';

export type CollectionCasesSlaStatus =
  | 'overdue'
  | 'due_today'
  | 'no_sla'
  | 'ok';

export type CollectionCasesPromiseStatus =
  | 'ACTIVE'
  | 'FULFILLED'
  | 'BROKEN'
  | 'CANCELLED'
  | 'EXPIRED';

export type CollectionCaseListItemResponse = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  contractCode: string;
  status: string;
  priority: string;
  daysOverdue: number;
  outstandingAmount: string;
  assignedTo: CollectionCaseAssigneeSummary | null;
  slaDueAt: string | null;
};

export type CollectionCaseInvoiceSummary = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  dueDate: string;
  amount: string;
  paidAmount: string;
};

export type CollectionCaseCancellationStepSummary = {
  id: string;
  stepCode: string;
  name: string;
  stepOrder: number;
  status: string;
  externalProtocol: string | null;
  completedAt: string | null;
  completedByName: string | null;
};

export type CollectionCaseCancellationSummary = {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  steps: CollectionCaseCancellationStepSummary[];
};

export type CollectionCaseCustomerSummary = {
  id: string;
  name: string;
  document: string;
  phone: string | null;
};

export type CollectionCaseContractSummary = {
  id: string;
  code: string;
  status: string;
};

export type CollectionCaseAssigneeSummary = {
  id: string;
  name: string;
};

export type CollectionCaseAttemptSummary = {
  id: string;
  channel: string;
  result: string;
  attemptedAt: string;
  notes?: string | null;
  nextContactAt?: string | null;
};

export type CreateCollectionAttemptPayload = {
  channel: string;
  result: string;
  notes?: string;
  nextContactAt?: string;
};

export type CollectionAttemptResponse = {
  id: string;
  collectionCaseId: string;
  channel: string;
  result: string;
  attemptedAt: string;
  notes: string | null;
  nextContactAt: string | null;
  performedByUserId: string | null;
};

export type CollectionCasePromiseSummary = {
  id: string;
  status: string;
  promisedAmount: string;
  promisedDate: string;
  notes?: string | null;
  fulfilledAt?: string | null;
  brokenAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
};

export type CreatePaymentPromisePayload = {
  promisedAmount: number;
  promisedDate: string;
  notes?: string;
};

export type UpdatePaymentPromiseStatusPayload = {
  notes?: string;
};

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

export type CollectionCaseTimelineEventType =
  | 'CASE_CREATED'
  | 'ATTEMPT_CREATED'
  | 'PAYMENT_PROMISE_CREATED'
  | 'PAYMENT_PROMISE_FULFILLED'
  | 'PAYMENT_PROMISE_BROKEN'
  | 'PAYMENT_PROMISE_CANCELLED'
  | 'CASE_SENT_TO_CANCELLATION'
  | 'CANCELLATION_STEP_COMPLETED'
  | 'CANCELLATION_PROCESS_COMPLETED'
  | 'AUDIT_EVENT';

export type CollectionCaseTimelineEvent = {
  id: string;
  type: CollectionCaseTimelineEventType;
  title: string;
  description: string;
  occurredAt: string;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
};

export type CollectionCaseTimelineResponse = {
  caseId: string;
  events: CollectionCaseTimelineEvent[];
};

export type SendToCancellationPayload = {
  reason: string;
  notes?: string;
};

export type RevertCancellationPayload = {
  reason: string;
  notes?: string;
};

export type AssignCasePayload = {
  assignedUserId: string | null;
};

export type ContactCustomerWhatsAppResponse = {
  attemptId: string;
  provider: string;
  statusCode: number;
};

export type CancellationProcessResponse = {
  id: string;
  collectionCaseId: string;
  status: string;
  reason: string;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type CollectionCaseDetailsResponse = {
  id: string;
  customer: CollectionCaseCustomerSummary;
  contract: CollectionCaseContractSummary;
  status: string;
  priority: string;
  daysOverdue: number;
  outstandingAmount: string;
  totalOutstanding: string;
  assignedTo: CollectionCaseAssigneeSummary | null;
  slaDueAt: string | null;
  recentAttempts: CollectionCaseAttemptSummary[];
  attempts: CollectionCaseAttemptSummary[];
  activePromise: CollectionCasePromiseSummary | null;
  promises: CollectionCasePromiseSummary[];
  invoices: CollectionCaseInvoiceSummary[];
  cancellationProcess: CollectionCaseCancellationSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type BulkAssignCasesPayload = {
  caseIds: string[];
  assignedUserId: string | null;
};

export type BulkAssignCasesResponse = {
  assigned: number;
  skipped: number;
};

export type AutoDistributePayload = {
  statuses: string[];
  targetRole: string;
};

export type AutoDistributeResponse = {
  distributed: number;
  agents: number;
};

export type CollectionCasesListParams = {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assignedToId?: string;
  search?: string;
  daysOverdueMin?: number;
  daysOverdueMax?: number;
  totalOutstandingMin?: number;
  totalOutstandingMax?: number;
  slaStatus?: CollectionCasesSlaStatus;
  createdToday?: boolean;
  interactionStatus?: 'none';
  promiseStatus?: CollectionCasesPromiseStatus;
  sortBy?: CollectionCasesSortBy;
  sortDirection?: CollectionCasesSortDirection;
};
