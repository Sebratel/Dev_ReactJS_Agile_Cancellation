import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  auditoriaFiltersToSearchParams,
  EMPTY_AUDITORIA_FILTERS,
  parseAuditoriaSearchParams,
  type AuditoriaFiltersState,
} from '@/features/auditoria/utils/auditoria-search-params';

export function useAuditoriaSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseAuditoriaSearchParams(searchParams);

  const updateFilters = useCallback(
    (
      changes:
        | Partial<AuditoriaFiltersState>
        | ((current: AuditoriaFiltersState) => Partial<AuditoriaFiltersState>),
    ) => {
      setSearchParams(
        (currentParams) => {
          const current = parseAuditoriaSearchParams(currentParams);
          const patch =
            typeof changes === 'function' ? changes(current) : changes;
          const next = { ...current, ...patch };

          return auditoriaFiltersToSearchParams(next);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearFilters,
    emptyFilters: EMPTY_AUDITORIA_FILTERS,
  };
}
