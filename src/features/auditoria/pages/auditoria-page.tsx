import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button } from '@/components/ui/button';
import { AuditoriaFilters } from '@/features/auditoria/components/auditoria-filters';
import { AuditoriaTimeline } from '@/features/auditoria/components/auditoria-timeline';
import { useAuditLogs } from '@/features/auditoria/hooks/use-audit-logs';
import { useAuditoriaSearchParams } from '@/features/auditoria/hooks/use-auditoria-search-params';
import {
  auditoriaFiltersToListParams,
  hasActiveAuditoriaFilters,
} from '@/features/auditoria/utils/auditoria-search-params';
import { useUsers } from '@/features/users/hooks/use-users';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export default function AuditoriaPage() {
  const { filters, updateFilters, clearFilters } = useAuditoriaSearchParams();
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const nextSearch = debouncedSearch.trim();

    if (nextSearch === filters.search.trim()) {
      return;
    }

    if (searchInput.trim() === '' && filters.search.trim() === '') {
      return;
    }

    updateFilters({ search: nextSearch, page: 1 });
  }, [debouncedSearch, filters.search, searchInput, updateFilters]);

  const handleClearFilters = () => {
    setSearchInput('');
    clearFilters();
  };

  const listParams = useMemo(
    () => auditoriaFiltersToListParams(filters, debouncedSearch),
    [filters, debouncedSearch],
  );

  const logsQuery = useAuditLogs(listParams);
  // Inclui inativos: ações antigas de quem saiu continuam consultáveis.
  const actorsQuery = useUsers({ limit: 100 });

  const handleRetry = () => {
    void logsQuery.refetch();
  };

  const items = logsQuery.data?.items ?? [];
  const totalPages = Math.max(logsQuery.data?.pagination.totalPages ?? 1, 1);
  const hasActiveFilters = hasActiveAuditoriaFilters({
    ...filters,
    search: debouncedSearch,
  });

  return (
    <PageContainer>
      <PageHeader
        title="Auditoria"
        description="Quem fez o quê, em qual cliente e quando: consulte as ações da equipe por pessoa, tipo e período."
        actions={
          <Button onClick={handleRetry} disabled={logsQuery.isLoading}>
            Atualizar registros
          </Button>
        }
      />

      <AuditoriaFilters
        filters={filters}
        actors={actorsQuery.data?.items ?? []}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onFilterChange={updateFilters}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {logsQuery.isLoading ? <TableSkeleton rows={6} columns={4} /> : null}

      {logsQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar a auditoria"
          description="Verifique se o backend está disponível e se seu perfil possui permissão de consulta."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!logsQuery.isLoading && !logsQuery.isError && items.length === 0 ? (
        <EmptyState
          title="Nenhum registro encontrado"
          description={
            hasActiveFilters
              ? 'Nenhum log corresponde aos filtros aplicados. Ajuste os critérios ou limpe os filtros.'
              : 'A API não retornou registros de auditoria para exibição neste momento.'
          }
          actionLabel={hasActiveFilters ? 'Limpar filtros' : 'Atualizar'}
          onAction={hasActiveFilters ? handleClearFilters : handleRetry}
        />
      ) : null}

      {!logsQuery.isLoading && !logsQuery.isError && items.length > 0 ? (
        <AuditoriaTimeline
          items={items}
          page={filters.page}
          totalPages={totalPages}
          onPageChange={(page) => updateFilters({ page })}
        />
      ) : null}
    </PageContainer>
  );
}
