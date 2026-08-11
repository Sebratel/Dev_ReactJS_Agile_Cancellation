import {
  AUDIT_LOGS_DEFAULT_LIMIT,
  type AuditLogsListParams,
} from '@/features/auditoria/types/auditoria-api.types';

export type AuditoriaFiltersState = {
  search: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  startDate: string;
  endDate: string;
  page: number;
};

export const EMPTY_AUDITORIA_FILTERS: AuditoriaFiltersState = {
  search: '',
  actorId: '',
  entityType: '',
  entityId: '',
  action: '',
  startDate: '',
  endDate: '',
  page: 1,
};

function parsePositiveInt(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

export function parseAuditoriaSearchParams(
  searchParams: URLSearchParams,
): AuditoriaFiltersState {
  return {
    search: searchParams.get('search') ?? '',
    actorId: searchParams.get('actorId') ?? '',
    entityType: searchParams.get('entityType') ?? '',
    entityId: searchParams.get('entityId') ?? '',
    action: searchParams.get('action') ?? '',
    startDate: searchParams.get('startDate') ?? '',
    endDate: searchParams.get('endDate') ?? '',
    page: parsePositiveInt(searchParams.get('page')) ?? 1,
  };
}

export function auditoriaFiltersToSearchParams(
  filters: AuditoriaFiltersState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.actorId.trim()) {
    params.set('actorId', filters.actorId.trim());
  }

  if (filters.entityType.trim()) {
    params.set('entityType', filters.entityType.trim());
  }

  if (filters.entityId.trim()) {
    params.set('entityId', filters.entityId.trim());
  }

  if (filters.action.trim()) {
    params.set('action', filters.action.trim());
  }

  if (filters.startDate.trim()) {
    params.set('startDate', filters.startDate.trim());
  }

  if (filters.endDate.trim()) {
    params.set('endDate', filters.endDate.trim());
  }

  if (filters.page > 1) {
    params.set('page', String(filters.page));
  }

  return params;
}

export function auditoriaFiltersToListParams(
  filters: AuditoriaFiltersState,
  searchValue: string,
): AuditLogsListParams {
  const search = searchValue.trim();

  return {
    page: filters.page,
    limit: AUDIT_LOGS_DEFAULT_LIMIT,
    actorId: filters.actorId.trim() || undefined,
    entityType: filters.entityType.trim() || undefined,
    entityId: filters.entityId.trim() || undefined,
    action: filters.action.trim() || undefined,
    startDate: filters.startDate.trim() || undefined,
    endDate: filters.endDate.trim() || undefined,
    search: search || undefined,
  };
}

export function hasActiveAuditoriaFilters(filters: AuditoriaFiltersState) {
  return (
    filters.search.trim().length > 0 ||
    filters.actorId.trim().length > 0 ||
    filters.entityType.trim().length > 0 ||
    filters.entityId.trim().length > 0 ||
    filters.action.trim().length > 0 ||
    filters.startDate.trim().length > 0 ||
    filters.endDate.trim().length > 0
  );
}
