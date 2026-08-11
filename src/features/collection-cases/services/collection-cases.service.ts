import { httpClient } from '@/services/api/http-client';
import { type PaginatedResponse } from '@/services/api/types/api-envelope';
import {
  type AssignCasePayload,
  type AutoDistributePayload,
  type AutoDistributeResponse,
  type BulkAssignCasesPayload,
  type BulkAssignCasesResponse,
  type CollectionAttemptResponse,
  type CollectionCaseDetailsResponse,
  type CollectionCaseTimelineResponse,
  type CancellationProcessResponse,
  type ContactCustomerWhatsAppResponse,
  type CollectionCaseListItemResponse,
  type CollectionCasesListParams,
  type CreateCollectionAttemptPayload,
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

function buildCollectionCasesPath(params: CollectionCasesListParams) {
  const searchParams = new URLSearchParams();
  appendParam(searchParams, 'page', params.page ?? 1);
  appendParam(searchParams, 'limit', params.limit ?? 10);
  appendParam(searchParams, 'status', params.status);
  appendParam(searchParams, 'priority', params.priority);
  appendParam(searchParams, 'assignedToId', params.assignedToId);
  appendParam(searchParams, 'search', params.search);
  appendParam(searchParams, 'daysOverdueMin', params.daysOverdueMin);
  appendParam(searchParams, 'daysOverdueMax', params.daysOverdueMax);
  appendParam(searchParams, 'totalOutstandingMin', params.totalOutstandingMin);
  appendParam(searchParams, 'totalOutstandingMax', params.totalOutstandingMax);
  appendParam(searchParams, 'slaStatus', params.slaStatus);
  if (params.createdToday) {
    searchParams.set('createdToday', 'true');
  }
  appendParam(searchParams, 'interactionStatus', params.interactionStatus);
  appendParam(searchParams, 'promiseStatus', params.promiseStatus);
  appendParam(searchParams, 'sortBy', params.sortBy);
  appendParam(searchParams, 'sortDirection', params.sortDirection);

  return `/collection-cases?${searchParams.toString()}`;
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

export async function autoDistribute(payload: AutoDistributePayload) {
  const response = await httpClient.request<AutoDistributeResponse>({
    path: '/collection-cases/auto-distribute',
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export { buildCollectionCasesPath };
