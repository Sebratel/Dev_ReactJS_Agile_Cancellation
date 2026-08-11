import { httpClient } from '@/services/api/http-client';
import {
  type AuditLogsListParams,
  type AuditLogsPageResponse,
} from '@/features/auditoria/types/auditoria-api.types';

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (value === undefined || value === '') {
    return;
  }

  params.set(key, String(value));
}

export function buildAuditLogsPath(params: AuditLogsListParams = {}) {
  const searchParams = new URLSearchParams();

  appendParam(searchParams, 'page', params.page);
  appendParam(searchParams, 'limit', params.limit);
  appendParam(searchParams, 'actorId', params.actorId);
  appendParam(searchParams, 'entityType', params.entityType);
  appendParam(searchParams, 'entityId', params.entityId);
  appendParam(searchParams, 'action', params.action);
  appendParam(searchParams, 'startDate', params.startDate);
  appendParam(searchParams, 'endDate', params.endDate);
  appendParam(searchParams, 'search', params.search);

  const query = searchParams.toString();

  return query ? `/audit-logs?${query}` : '/audit-logs';
}

export async function getAuditLogs(params: AuditLogsListParams = {}) {
  const response = await httpClient.request<AuditLogsPageResponse>({
    path: buildAuditLogsPath(params),
  });

  return response.data;
}
