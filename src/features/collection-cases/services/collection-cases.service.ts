import { httpClient } from '@/services/api/http-client';
import { type RenegotiationSummaryResponse } from '@/features/dashboard/types/dashboard-api.types';
import { type PaginatedResponse } from '@/services/api/types/api-envelope';
import {
  type AssignCasePayload,
  type AutoDistributePayload,
  type AutoDistributeResponse,
  type BulkAssignCasesPayload,
  type BulkAssignCasesResponse,
  type BulkSendToCancellationPayload,
  type BulkSendToCancellationResponse,
  type CollectionAttemptResponse,
  type CollectionCaseDetailsResponse,
  type CollectionCaseTimelineResponse,
  type CancellationProcessResponse,
  type ContactCustomerWhatsAppResponse,
  type CollectionCaseListItemResponse,
  type BulkContactWhatsAppJobResponse,
  type CollectionCasesListParams,
  type CreateCollectionAttemptPayload,
  type OverdueDateSummaryResponse,
  type CollectionCasePortfoliosResponse,
  type CollectionCasesStatusSummaryResponse,
  type CollectionCasesIntakeSummaryResponse,
  type RenegotiatedHistoryResponse,
  type RenegotiationDetailResponse,
  type CreatePaymentPromisePayload,
  type PaymentPromiseResponse,
  type RevertCancellationPayload,
  type SendToCancellationPayload,
  type UpdatePaymentPromiseStatusPayload,
} from '@/features/collection-cases/types/collection-cases-api.types';

function appendParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (value === undefined || value === '') {
    return;
  }

  searchParams.set(key, String(value));
}

function buildCollectionCasesSearchParams(params: CollectionCasesListParams) {
  const searchParams = new URLSearchParams();
  appendParam(searchParams, 'page', params.page ?? 1);
  appendParam(searchParams, 'limit', params.limit ?? 10);
  appendParam(searchParams, 'status', params.status);
  appendParam(searchParams, 'priority', params.priority);
  appendParam(searchParams, 'assignedToId', params.assignedToId);
  appendParam(searchParams, 'contractStatus', params.contractStatus);
  appendParam(searchParams, 'search', params.search);
  appendParam(searchParams, 'daysOverdueMin', params.daysOverdueMin);
  appendParam(searchParams, 'daysOverdueMax', params.daysOverdueMax);
  appendParam(searchParams, 'totalOutstandingMin', params.totalOutstandingMin);
  appendParam(searchParams, 'totalOutstandingMax', params.totalOutstandingMax);
  appendParam(searchParams, 'firstDueDate', params.firstDueDate);
  appendParam(searchParams, 'secondDueDate', params.secondDueDate);
  appendParam(searchParams, 'assignedFrom', params.assignedFrom);
  appendParam(searchParams, 'assignedTo', params.assignedTo);
  appendParam(searchParams, 'slaStatus', params.slaStatus);
  if (params.createdToday) {
    searchParams.set('createdToday', 'true');
  }
  appendParam(searchParams, 'interactionStatus', params.interactionStatus);
  appendParam(searchParams, 'promiseStatus', params.promiseStatus);
  appendParam(searchParams, 'sortBy', params.sortBy);
  appendParam(searchParams, 'sortDirection', params.sortDirection);

  return searchParams;
}

function buildCollectionCasesPath(params: CollectionCasesListParams) {
  return `/collection-cases?${buildCollectionCasesSearchParams(params).toString()}`;
}

export async function getCollectionCases(
  params: CollectionCasesListParams = {},
) {
  const response = await httpClient.request<
    PaginatedResponse<CollectionCaseListItemResponse>
  >({
    path: buildCollectionCasesPath(params),
  });

  return response.data;
}

export async function getOverdueDateSummary(
  params: CollectionCasesListParams = {},
) {
  const searchParams = buildCollectionCasesSearchParams(params);
  // Contagem por data e independente de paginacao/ordenacao — nao faz
  // sentido repassar essas duas ao popover.
  searchParams.delete('page');
  searchParams.delete('limit');
  searchParams.delete('sortBy');
  searchParams.delete('sortDirection');

  const response = await httpClient.request<OverdueDateSummaryResponse>({
    path: `/collection-cases/overdue-dates-summary?${searchParams.toString()}`,
  });

  return response.data;
}

export async function getCollectionCasePortfolios() {
  const response = await httpClient.request<CollectionCasePortfoliosResponse>({
    path: '/collection-cases/portfolios',
  });

  return response.data;
}

export async function getCollectionCasesStatusSummary() {
  const response =
    await httpClient.request<CollectionCasesStatusSummaryResponse>({
      path: '/collection-cases/status-summary',
    });

  return response.data;
}

export async function getCollectionCasesIntakeSummary() {
  const response =
    await httpClient.request<CollectionCasesIntakeSummaryResponse>({
      path: '/collection-cases/intake-summary',
    });

  return response.data;
}

export async function getRenegotiatedHistory() {
  const response = await httpClient.request<RenegotiatedHistoryResponse>({
    path: '/erp/renegotiation-history',
  });

  return response.data;
}

export async function getRenegotiationSummary() {
  const response = await httpClient.request<RenegotiationSummaryResponse>({
    path: '/erp/renegotiation-summary',
  });

  return response.data;
}

export async function getRenegotiationDetail(contractExternalId: string) {
  const response = await httpClient.request<RenegotiationDetailResponse>({
    path: `/erp/renegotiation-detail/${contractExternalId}`,
  });

  return response.data;
}

export async function getCollectionCaseById(caseId: string) {
  const response = await httpClient.request<CollectionCaseDetailsResponse>({
    path: `/collection-cases/${caseId}`,
  });

  return response.data;
}

export async function getCollectionCaseTimeline(caseId: string) {
  const response = await httpClient.request<CollectionCaseTimelineResponse>({
    path: `/collection-cases/${caseId}/timeline`,
  });

  return response.data;
}

export async function sendCaseToCancellation(
  caseId: string,
  payload: SendToCancellationPayload,
) {
  const response = await httpClient.request<CancellationProcessResponse>({
    path: `/collection-cases/${caseId}/send-to-cancellation`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function revertCancellation(
  caseId: string,
  payload: RevertCancellationPayload,
) {
  const response = await httpClient.request<CollectionCaseDetailsResponse>({
    path: `/collection-cases/${caseId}/revert-cancellation`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function assignCase(caseId: string, payload: AssignCasePayload) {
  const response = await httpClient.request<CollectionCaseDetailsResponse>({
    path: `/collection-cases/${caseId}/assign`,
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function createCollectionAttempt(
  caseId: string,
  payload: CreateCollectionAttemptPayload,
) {
  const response = await httpClient.request<CollectionAttemptResponse>({
    path: `/collection-cases/${caseId}/attempts`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function contactCustomerByWhatsApp(caseId: string) {
  const response =
    await httpClient.request<ContactCustomerWhatsAppResponse>({
      path: `/collection-cases/${caseId}/contact-whatsapp`,
      method: 'POST',
    });

  return response.data;
}

export async function createPaymentPromise(
  caseId: string,
  payload: CreatePaymentPromisePayload,
) {
  const response = await httpClient.request<PaymentPromiseResponse>({
    path: `/collection-cases/${caseId}/promises`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function fulfillPaymentPromise(
  caseId: string,
  promiseId: string,
  payload: UpdatePaymentPromiseStatusPayload = {},
) {
  const response = await httpClient.request<PaymentPromiseResponse>({
    path: `/collection-cases/${caseId}/promises/${promiseId}/fulfill`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function breakPaymentPromise(
  caseId: string,
  promiseId: string,
  payload: UpdatePaymentPromiseStatusPayload = {},
) {
  const response = await httpClient.request<PaymentPromiseResponse>({
    path: `/collection-cases/${caseId}/promises/${promiseId}/break`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function cancelPaymentPromise(
  caseId: string,
  promiseId: string,
  payload: UpdatePaymentPromiseStatusPayload = {},
) {
  const response = await httpClient.request<PaymentPromiseResponse>({
    path: `/collection-cases/${caseId}/promises/${promiseId}/cancel`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function bulkAssignCases(payload: BulkAssignCasesPayload) {
  const response = await httpClient.request<BulkAssignCasesResponse>({
    path: '/collection-cases/bulk-assign',
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function bulkSendToCancellation(
  payload: BulkSendToCancellationPayload,
) {
  const response = await httpClient.request<BulkSendToCancellationResponse>({
    path: '/collection-cases/send-to-cancellation-bulk',
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function createBulkContactWhatsAppJob(caseIds: string[]) {
  const response = await httpClient.request<BulkContactWhatsAppJobResponse>({
    path: '/bulk-contact-whatsapp',
    method: 'POST',
    body: JSON.stringify({ caseIds }),
  });
  return response.data;
}

export async function getBulkContactWhatsAppJob(jobId: string) {
  const response = await httpClient.request<BulkContactWhatsAppJobResponse>({
    path: `/bulk-contact-whatsapp/${jobId}`,
  });
  return response.data;
}

// Tela dedicada de envio em lote: em vez de uma lista de ids ja marcada,
// manda os mesmos filtros da Supervisao e o backend resolve o grupo inteiro.
export async function createBulkContactWhatsAppJobByFilter(
  filters: CollectionCasesListParams,
) {
  const response = await httpClient.request<BulkContactWhatsAppJobResponse>({
    path: '/bulk-contact-whatsapp/by-filter',
    method: 'POST',
    body: JSON.stringify(filters),
  });
  return response.data;
}

export async function listBulkContactWhatsAppJobs(params: {
  page: number;
  limit: number;
}) {
  const searchParams = new URLSearchParams();
  appendParam(searchParams, 'page', params.page);
  appendParam(searchParams, 'limit', params.limit);

  const response = await httpClient.request<
    PaginatedResponse<BulkContactWhatsAppJobResponse>
  >({
    path: `/bulk-contact-whatsapp?${searchParams.toString()}`,
  });
  return response.data;
}

export async function autoDistribute(payload: AutoDistributePayload) {
  const response = await httpClient.request<AutoDistributeResponse>({
    path: '/collection-cases/auto-distribute',
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export { buildCollectionCasesPath };
