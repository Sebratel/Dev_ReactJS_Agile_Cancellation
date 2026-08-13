import {
  type CollectionCasesListParams,
  type CollectionCasesPromiseStatus,
  type CollectionCasesSortBy,
  type CollectionCasesSortDirection,
  type CollectionCasesSlaStatus,
} from '@/features/collection-cases/types/collection-cases-api.types';

export const SUPERVISION_DEFAULT_LIMIT = 10;

export type SupervisionFiltersState = {
  status: string;
  priority: string;
  search: string;
  daysOverdueMin: string;
  daysOverdueMax: string;
  totalOutstandingMin: string;
  totalOutstandingMax: string;
  dueDateStart: string;
  dueDateEnd: string;
  slaStatus: string;
  createdToday: string;
  interactionStatus: string;
  promiseStatus: string;
  sortBy: CollectionCasesSortBy | '';
  sortDirection: CollectionCasesSortDirection;
  page: number;
};

export const EMPTY_SUPERVISION_FILTERS: SupervisionFiltersState = {
  status: '',
  priority: '',
  search: '',
  daysOverdueMin: '',
  daysOverdueMax: '',
  totalOutstandingMin: '',
  totalOutstandingMax: '',
  dueDateStart: '',
  dueDateEnd: '',
  slaStatus: '',
  createdToday: '',
  interactionStatus: '',
  promiseStatus: '',
  sortBy: '',
  sortDirection: 'desc',
  page: 1,
};

function parsePositiveInt(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function parseOptionalNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function isSortBy(value: string | null): value is CollectionCasesSortBy {
  return (
    value === 'daysOverdue' ||
    value === 'totalOutstanding' ||
    value === 'slaDueAt' ||
    value === 'createdAt'
  );
}

function isSortDirection(
  value: string | null,
): value is CollectionCasesSortDirection {
  return value === 'asc' || value === 'desc';
}

function isSlaStatus(value: string | null): value is CollectionCasesSlaStatus {
  return (
    value === 'overdue' ||
    value === 'due_today' ||
    value === 'no_sla' ||
    value === 'ok'
  );
}

function isInteractionStatus(value: string | null) {
  return value === 'none';
}

function isPromiseStatus(
  value: string | null,
): value is CollectionCasesPromiseStatus {
  return (
    value === 'ACTIVE' ||
    value === 'FULFILLED' ||
    value === 'BROKEN' ||
    value === 'CANCELLED' ||
    value === 'EXPIRED'
  );
}

export function parseSupervisionSearchParams(
  searchParams: URLSearchParams,
): SupervisionFiltersState {
  const sortByParam = searchParams.get('sortBy');
  const sortDirectionParam = searchParams.get('sortDirection');

  return {
    status: searchParams.get('status') ?? '',
    priority: searchParams.get('priority') ?? '',
    search: searchParams.get('search') ?? '',
    daysOverdueMin: searchParams.get('daysOverdueMin') ?? '',
    daysOverdueMax: searchParams.get('daysOverdueMax') ?? '',
    totalOutstandingMin: searchParams.get('totalOutstandingMin') ?? '',
    totalOutstandingMax: searchParams.get('totalOutstandingMax') ?? '',
    dueDateStart: searchParams.get('dueDateStart') ?? '',
    dueDateEnd: searchParams.get('dueDateEnd') ?? '',
    slaStatus: searchParams.get('slaStatus') ?? '',
    createdToday: searchParams.get('createdToday') ?? '',
    interactionStatus: searchParams.get('interactionStatus') ?? '',
    promiseStatus: searchParams.get('promiseStatus') ?? '',
    sortBy: isSortBy(sortByParam) ? sortByParam : '',
    sortDirection: isSortDirection(sortDirectionParam)
      ? sortDirectionParam
      : 'desc',
    page: parsePositiveInt(searchParams.get('page')) ?? 1,
  };
}

export function supervisionFiltersToSearchParams(
  filters: SupervisionFiltersState,
) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.priority) {
    params.set('priority', filters.priority);
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.daysOverdueMin) {
    params.set('daysOverdueMin', filters.daysOverdueMin);
  }

  if (filters.daysOverdueMax) {
    params.set('daysOverdueMax', filters.daysOverdueMax);
  }

  if (filters.totalOutstandingMin) {
    params.set('totalOutstandingMin', filters.totalOutstandingMin);
  }

  if (filters.totalOutstandingMax) {
    params.set('totalOutstandingMax', filters.totalOutstandingMax);
  }

  if (filters.dueDateStart) {
    params.set('dueDateStart', filters.dueDateStart);
  }

  if (filters.dueDateEnd) {
    params.set('dueDateEnd', filters.dueDateEnd);
  }

  if (filters.slaStatus) {
    params.set('slaStatus', filters.slaStatus);
  }

  if (filters.createdToday === 'true') {
    params.set('createdToday', 'true');
  }

  if (filters.interactionStatus) {
    params.set('interactionStatus', filters.interactionStatus);
  }

  if (filters.promiseStatus) {
    params.set('promiseStatus', filters.promiseStatus);
  }

  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
    params.set('sortDirection', filters.sortDirection);
  }

  if (filters.page > 1) {
    params.set('page', String(filters.page));
  }

  return params;
}

export function supervisionFiltersToListParams(
  filters: SupervisionFiltersState,
  searchValue: string,
): CollectionCasesListParams {
  return {
    page: filters.page,
    limit: SUPERVISION_DEFAULT_LIMIT,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    search: searchValue.trim() || undefined,
    daysOverdueMin: parsePositiveInt(filters.daysOverdueMin),
    daysOverdueMax: parsePositiveInt(filters.daysOverdueMax),
    totalOutstandingMin: parseOptionalNumber(filters.totalOutstandingMin),
    totalOutstandingMax: parseOptionalNumber(filters.totalOutstandingMax),
    dueDateStart: filters.dueDateStart.trim() || undefined,
    dueDateEnd: filters.dueDateEnd.trim() || undefined,
    slaStatus: isSlaStatus(filters.slaStatus) ? filters.slaStatus : undefined,
    createdToday: filters.createdToday === 'true' ? true : undefined,
    interactionStatus: isInteractionStatus(filters.interactionStatus)
      ? filters.interactionStatus
      : undefined,
    promiseStatus: isPromiseStatus(filters.promiseStatus)
      ? filters.promiseStatus
      : undefined,
    sortBy: filters.sortBy || undefined,
    sortDirection: filters.sortBy ? filters.sortDirection : undefined,
  };
}

export function hasActiveSupervisionFilters(filters: SupervisionFiltersState) {
  return (
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.search.trim().length > 0 ||
    filters.daysOverdueMin.length > 0 ||
    filters.daysOverdueMax.length > 0 ||
    filters.totalOutstandingMin.length > 0 ||
    filters.totalOutstandingMax.length > 0 ||
    filters.dueDateStart.length > 0 ||
    filters.dueDateEnd.length > 0 ||
    filters.slaStatus.length > 0 ||
    filters.createdToday.length > 0 ||
    filters.interactionStatus.length > 0 ||
    filters.promiseStatus.length > 0 ||
    filters.sortBy.length > 0 ||
    filters.page > 1
  );
}
