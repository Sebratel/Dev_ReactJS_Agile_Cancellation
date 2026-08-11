import type { AttemptChannel, AttemptResult } from '@prisma/client';
import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import type { CollectionAttemptResponse } from '@/modules/collection-cases/dto/collection-attempt.response';
import type { PaymentPromiseResponse } from '@/modules/collection-cases/dto/payment-promise.response';
import type { CollectionCaseDetailsResponse } from '@/modules/collection-cases/dto/collection-case-details.response';
import type { CancellationProcessResponse } from '@/modules/collection-cases/dto/cancellation-process.response';
import type { CollectionCaseTimelineResponse } from '@/modules/collection-cases/dto/collection-case-timeline.response';
import type { CollectionCaseListItemResponse } from '@/modules/collection-cases/dto/collection-case-list-item.response';
import type { CollectionCasesQueryDto } from '@/modules/collection-cases/dto/collection-cases-query.dto';
import {
  type CollectionCasesInteractionStatus,
  type CollectionCasesPromiseStatus,
  type CollectionCasesSlaStatus,
  type CollectionCasesSortBy,
  type CollectionCasesSortDirection,
} from '@/modules/collection-cases/dto/collection-cases-query.dto';

export type {
  CollectionCasesInteractionStatus,
  CollectionCasesPromiseStatus,
  CollectionCasesSlaStatus,
  CollectionCasesSortBy,
  CollectionCasesSortDirection,
};

export type CreatePaymentPromiseInput = {
  promisedAmount: number;
  promisedDate: string;
  notes?: string;
};

export type CreatePaymentPromiseParams = {
  caseId: string;
  input: CreatePaymentPromiseInput;
  createdByUserId: string | null;
};

export type PaymentPromiseStatusAction = 'FULFILLED' | 'BROKEN' | 'CANCELLED';

export type UpdatePaymentPromiseStatusInput = {
  notes?: string;
};

export type UpdatePaymentPromiseStatusParams = {
  caseId: string;
  promiseId: string;
  action: PaymentPromiseStatusAction;
  input?: UpdatePaymentPromiseStatusInput;
  performedByUserId: string | null;
};

export type UpdatePaymentPromiseStatusResult =
  | { outcome: 'success'; promise: PaymentPromiseResponse }
  | { outcome: 'case_not_found' }
  | { outcome: 'promise_not_found' }
  | { outcome: 'invalid_transition'; currentStatus: string };

export type CreateCollectionAttemptInput = {
  channel: AttemptChannel;
  result: AttemptResult;
  notes?: string;
  nextContactAt?: string;
};

export type CreateCollectionAttemptParams = {
  caseId: string;
  input: CreateCollectionAttemptInput;
  performedByUserId: string | null;
};

export type CollectionCaseContactContext = {
  id: string;
  status: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  contract: {
    id: string;
    code: string;
  };
};

export type RecordWhatsAppContactIntegrationParams = {
  caseId: string;
  performedByUserId: string | null;
  status: 'COMPLETED' | 'FAILED';
  payload: Record<string, unknown>;
  matrixAttendanceCode?: string | null;
  matrixMessageCode?: string | null;
  errorMessage?: string;
};

export type RecordWhatsAppContactIntegrationResult = {
  attemptId: string;
  integrationEventId: string;
  matrixAttendanceCode: string | null;
  matrixMessageCode: string | null;
};

export type SendToCancellationInput = {
  reason: string;
  notes?: string;
};

export type SendToCancellationParams = {
  caseId: string;
  input: SendToCancellationInput;
  performedByUserId: string | null;
};

export type SendToCancellationResult =
  | { outcome: 'success'; cancellationProcess: CancellationProcessResponse }
  | { outcome: 'case_not_found' }
  | { outcome: 'already_in_cancellation' }
  | { outcome: 'status_not_allowed'; currentStatus: string };

export type AssignCaseParams = {
  caseId: string;
  assignedUserId: string | null;
  performedByUserId: string | null;
};

export type AssignCaseResult =
  | { outcome: 'success'; case: CollectionCaseDetailsResponse }
  | { outcome: 'case_not_found' }
  | { outcome: 'user_not_found' };

export type BulkAssignCasesParams = {
  caseIds: string[];
  assignedUserId: string | null;
  performedByUserId: string | null;
};

export type BulkAssignCasesResult = {
  assigned: number;
  skipped: number;
};

export type AutoDistributeCasesParams = {
  statuses: string[];
  targetRole: string;
  performedByUserId: string | null;
};

export type AutoDistributeCasesResult = {
  distributed: number;
  agents: number;
};

export type RevertCancellationInput = {
  reason: string;
  notes?: string;
};

export type RevertCancellationParams = {
  caseId: string;
  input: RevertCancellationInput;
  performedByUserId: string | null;
};

export type RevertCancellationResult =
  | { outcome: 'success'; case: CollectionCaseDetailsResponse }
  | { outcome: 'case_not_found' }
  | { outcome: 'status_not_allowed'; currentStatus: string };

export type CollectionCasesListParams = {
  page: number;
  limit: number;
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
  interactionStatus?: CollectionCasesInteractionStatus;
  promiseStatus?: CollectionCasesPromiseStatus;
  sortBy?: CollectionCasesSortBy;
  sortDirection?: CollectionCasesSortDirection;
};

export interface CollectionCasesRepository {
  listCases(
    params: CollectionCasesListParams,
  ): Promise<PaginatedResponse<CollectionCaseListItemResponse>>;

  getCaseById(id: string): Promise<CollectionCaseDetailsResponse | null>;

  getCaseTimeline(id: string): Promise<CollectionCaseTimelineResponse | null>;

  createAttempt(
    params: CreateCollectionAttemptParams,
  ): Promise<CollectionAttemptResponse | null>;

  getContactContext(caseId: string): Promise<CollectionCaseContactContext | null>;

  recordWhatsAppContactIntegration(
    params: RecordWhatsAppContactIntegrationParams,
  ): Promise<RecordWhatsAppContactIntegrationResult>;

  createPromise(
    params: CreatePaymentPromiseParams,
  ): Promise<PaymentPromiseResponse | null>;

  updatePromiseStatus(
    params: UpdatePaymentPromiseStatusParams,
  ): Promise<UpdatePaymentPromiseStatusResult>;

  sendToCancellation(
    params: SendToCancellationParams,
  ): Promise<SendToCancellationResult>;

  revertCancellation(
    params: RevertCancellationParams,
  ): Promise<RevertCancellationResult>;

  assignCase(params: AssignCaseParams): Promise<AssignCaseResult>;

  bulkAssignCases(params: BulkAssignCasesParams): Promise<BulkAssignCasesResult>;
  autoDistributeCases(params: AutoDistributeCasesParams): Promise<AutoDistributeCasesResult>;
}

export function mapQueryDtoToListParams(
  query: CollectionCasesQueryDto,
): CollectionCasesListParams {
  return {
    page: query.page ?? 1,
    limit: query.limit ?? 10,
    status: query.status,
    priority: query.priority,
    assignedToId: query.assignedToId,
    search: query.search,
    daysOverdueMin: query.daysOverdueMin,
    daysOverdueMax: query.daysOverdueMax,
    totalOutstandingMin: query.totalOutstandingMin,
    totalOutstandingMax: query.totalOutstandingMax,
    slaStatus: query.slaStatus,
    createdToday: query.createdToday,
    interactionStatus: query.interactionStatus,
    promiseStatus: query.promiseStatus,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  };
}
