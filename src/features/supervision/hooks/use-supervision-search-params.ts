import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  EMPTY_SUPERVISION_FILTERS,
  parseSupervisionSearchParams,
  supervisionFiltersToSearchParams,
  type SupervisionFiltersState,
} from '@/features/supervision/utils/supervision-search-params';

export function useSupervisionSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => parseSupervisionSearchParams(searchParams),
    [searchParams],
  );

  const updateFilters = useCallback(
    (
      updater:
        | Partial<SupervisionFiltersState>
        | ((current: SupervisionFiltersState) => SupervisionFiltersState),
    ) => {
      const current = parseSupervisionSearchParams(searchParams);
      const next =
        typeof updater === 'function'
          ? updater(current)
          : { ...current, ...updater };

      const nextParams = supervisionFiltersToSearchParams(next);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearFilters,
    resetToDefaults: () => EMPTY_SUPERVISION_FILTERS,
  };
}
