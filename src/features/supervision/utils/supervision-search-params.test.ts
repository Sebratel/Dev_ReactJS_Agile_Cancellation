import { describe, expect, it } from 'vitest';
import {
  EMPTY_SUPERVISION_FILTERS,
  hasActiveSupervisionFilters,
  parseSupervisionSearchParams,
  supervisionFiltersToListParams,
  supervisionFiltersToSearchParams,
} from '@/features/supervision/utils/supervision-search-params';

describe('supervision search params', () => {
  it('le filtros da URL', () => {
    const params = new URLSearchParams(
      'status=IN_COLLECTION&priority=HIGH&search=joao&page=2&sortBy=daysOverdue&sortDirection=asc',
    );

    expect(parseSupervisionSearchParams(params)).toEqual({
      status: 'IN_COLLECTION',
      priority: 'HIGH',
      search: 'joao',
      daysOverdueMin: '',
      daysOverdueMax: '',
      totalOutstandingMin: '',
      totalOutstandingMax: '',
      slaStatus: '',
      createdToday: '',
      interactionStatus: '',
      promiseStatus: '',
      sortBy: 'daysOverdue',
      sortDirection: 'asc',
      page: 2,
    });
  });

  it('le novos filtros operacionais da URL', () => {
    const params = new URLSearchParams(
      'createdToday=true&interactionStatus=none&promiseStatus=ACTIVE',
    );

    expect(parseSupervisionSearchParams(params)).toMatchObject({
      createdToday: 'true',
      interactionStatus: 'none',
      promiseStatus: 'ACTIVE',
    });
  });

  it('serializa filtros para query params', () => {
    const params = supervisionFiltersToSearchParams({
      ...EMPTY_SUPERVISION_FILTERS,
      status: 'NO_RESPONSE',
      search: 'Horizonte',
      sortBy: 'totalOutstanding',
      sortDirection: 'desc',
      page: 3,
    });

    expect(params.get('status')).toBe('NO_RESPONSE');
    expect(params.get('search')).toBe('Horizonte');
    expect(params.get('sortBy')).toBe('totalOutstanding');
    expect(params.get('sortDirection')).toBe('desc');
    expect(params.get('page')).toBe('3');
  });

  it('converte filtros para list params da API', () => {
    expect(
      supervisionFiltersToListParams(
        {
          ...EMPTY_SUPERVISION_FILTERS,
          status: 'IN_COLLECTION',
          daysOverdueMin: '30',
          totalOutstandingMax: '15000',
          slaStatus: 'overdue',
          sortBy: 'slaDueAt',
          sortDirection: 'asc',
          page: 2,
        },
        'cliente',
      ),
    ).toEqual({
      page: 2,
      limit: 10,
      status: 'IN_COLLECTION',
      search: 'cliente',
      daysOverdueMin: 30,
      totalOutstandingMax: 15000,
      slaStatus: 'overdue',
      sortBy: 'slaDueAt',
      sortDirection: 'asc',
    });
  });

  it('identifica filtros ativos', () => {
    expect(hasActiveSupervisionFilters(EMPTY_SUPERVISION_FILTERS)).toBe(false);
    expect(
      hasActiveSupervisionFilters({
        ...EMPTY_SUPERVISION_FILTERS,
        priority: 'HIGH',
      }),
    ).toBe(true);
    expect(
      hasActiveSupervisionFilters({
        ...EMPTY_SUPERVISION_FILTERS,
        interactionStatus: 'none',
      }),
    ).toBe(true);
    expect(
      hasActiveSupervisionFilters({
        ...EMPTY_SUPERVISION_FILTERS,
        promiseStatus: 'ACTIVE',
      }),
    ).toBe(true);
  });

  it('limpa filtros novos ao serializar estado vazio', () => {
    const params = supervisionFiltersToSearchParams(EMPTY_SUPERVISION_FILTERS);

    expect(params.get('createdToday')).toBeNull();
    expect(params.get('interactionStatus')).toBeNull();
    expect(params.get('promiseStatus')).toBeNull();
  });
});
