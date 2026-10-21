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
  phone2: string | null;
};

export type CollectionCaseContractSummary = {
  id: string;
  code: string;
  status: string;
  // Status bruto do ERP (v_status do Elleven), para exibicao fiel.
  erpStatus: string | null;
  // Motivo do cancelamento (quando cancelado), vindo do ERP. `reason` é o texto
  // limpo ("Inadimplência"), `category` é a visão estratégica
  // (INADIMPLENCIA/EXTERNO/OUTRO), `categoryLabel` o rótulo amigável.
  cancellationReason: string | null;
  cancellationReasonCategory: string | null;
  cancellationReasonCategoryLabel: string | null;
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
  isAutomatic: boolean;
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

export type CollectionCaseMatrixContactSummary = {
  attendanceCode: string | null;
  messageCode: string | null;
  awaitingReply: boolean;
  lastOutboundAt: string | null;
  lastReplyAt: string | null;
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
  matrixContact: CollectionCaseMatrixContactSummary;
  cancellationProcess: CollectionCaseCancellationSummary | null;
  createdAt: string;
  updatedAt: string;
};
