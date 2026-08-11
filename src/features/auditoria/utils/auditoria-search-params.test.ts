import { describe, expect, it } from 'vitest';
import {
  auditoriaFiltersToListParams,
  auditoriaFiltersToSearchParams,
  EMPTY_AUDITORIA_FILTERS,
  hasActiveAuditoriaFilters,
  parseAuditoriaSearchParams,
} from '@/features/auditoria/utils/auditoria-search-params';

describe('auditoria-search-params', () => {
  it('parse filtros da URL', () => {
    const params = new URLSearchParams(
      'search=admin&actorId=user-admin&entityType=COLLECTION_CASE&action=CREATE&startDate=2026-06-01&endDate=2026-06-10&page=2',
    );

    expect(parseAuditoriaSearchParams(params)).toEqual({
      search: 'admin',
      actorId: 'user-admin',
      entityType: 'COLLECTION_CASE',
      entityId: '',
      action: 'CREATE',
      startDate: '2026-06-01',
      endDate: '2026-06-10',
      page: 2,
    });
  });

  it('serializa filtros para URL', () => {
    const params = auditoriaFiltersToSearchParams({
      ...EMPTY_AUDITORIA_FILTERS,
      search: 'case_1',
      action: 'CREATE',
      page: 2,
    });

    expect(params.get('search')).toBe('case_1');
    expect(params.get('action')).toBe('CREATE');
    expect(params.get('page')).toBe('2');
  });

  it('mapeia filtros para API', () => {
    expect(
      auditoriaFiltersToListParams(
        {
          ...EMPTY_AUDITORIA_FILTERS,
          actorId: 'user-admin',
          action: 'CREATE',
        },
        'Horizonte',
      ),
    ).toEqual({
      page: 1,
      limit: 20,
      actorId: 'user-admin',
      action: 'CREATE',
      search: 'Horizonte',
    });
  });

  it('detecta filtros ativos', () => {
    expect(hasActiveAuditoriaFilters(EMPTY_AUDITORIA_FILTERS)).toBe(false);
    expect(
      hasActiveAuditoriaFilters({
        ...EMPTY_AUDITORIA_FILTERS,
        startDate: '2026-06-01',
      }),
    ).toBe(true);
  });
});
