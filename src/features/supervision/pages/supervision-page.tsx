import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Shuffle } from 'lucide-react';
import { BulkActionBar } from '@/components/data-display/bulk-action-bar';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { CollectionCaseSnapshotStrip } from '@/features/collection-cases/components/collection-case-snapshot-strip';
import { useBulkAssignCases } from '@/features/collection-cases/hooks/use-bulk-assign-cases';
import { useAutoDistribute } from '@/features/collection-cases/hooks/use-auto-distribute';
import { useExportCasesCsv } from '@/features/collection-cases/hooks/use-export-cases-csv';
import { SupervisionCasesTable } from '@/features/supervision/components/supervision-cases-table';
import { SupervisionFilters } from '@/features/supervision/components/supervision-filters';
import { useSupervisionSearchParams } from '@/features/supervision/hooks/use-supervision-search-params';
import {
  hasActiveSupervisionFilters,
  supervisionFiltersToListParams,
} from '@/features/supervision/utils/supervision-search-params';
import { useUsers } from '@/features/users/hooks/use-users';
import { useUsersWorkload } from '@/features/users/hooks/use-users-workload';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

export default function SupervisionPage() {
  const { session } = useAuth();
  const canDistribute =
    session?.user.roles.some((r) => r === 'ADMIN' || r === 'SUPERVISOR') ?? false;

  const { filters, updateFilters, clearFilters } = useSupervisionSearchParams();
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const nextSearch = debouncedSearch.trim();
    if (nextSearch === filters.search.trim()) return;
    if (searchInput.trim() === '' && filters.search.trim() === '') return;
    updateFilters({ search: nextSearch, page: 1 });
  }, [debouncedSearch, filters.search, searchInput, updateFilters]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters.page]);

  const handleClearFilters = () => {
    setSearchInput('');
    clearFilters();
  };

  const listParams = useMemo(
    () => supervisionFiltersToListParams(filters, debouncedSearch),
    [filters, debouncedSearch],
  );

  const casesQuery = useCollectionCases(listParams);

  const agentsQuery = useUsers({
    status: 'ACTIVE',
    role: 'COLLECTION_AGENT',
    limit: 100,
    enabled: canDistribute,
  });
  const agents = agentsQuery.data?.items ?? [];
  const workloadQuery = useUsersWorkload(canDistribute);

  const bulkAssign = useBulkAssignCases();
  const autoDistributeMutation = useAutoDistribute();
  const { exportCsv, isExporting } = useExportCasesCsv();

  const handleRetry = () => { void casesQuery.refetch(); };

  const items = useMemo(() => casesQuery.data?.items ?? [], [casesQuery.data]);
  const totalPages = Math.max(casesQuery.data?.pagination.totalPages ?? 1, 1);
  const hasActiveFilters = hasActiveSupervisionFilters({
    ...filters,
    search: debouncedSearch,
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allOnPage = items.every((i) => prev.has(i.id));
      return allOnPage ? new Set() : new Set(items.map((i) => i.id));
    });
  }, [items]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  async function handleBulkAssign(assignedUserId: string | null) {
    try {
      const result = await bulkAssign.mutateAsync({
        caseIds: Array.from(selectedIds),
        assignedUserId,
      });
      toast.success(
        assignedUserId
          ? `${result.assigned} ${result.assigned === 1 ? 'caso atribuído' : 'casos atribuídos'} com sucesso.`
          : `Atribuição removida de ${result.assigned} ${result.assigned === 1 ? 'caso' : 'casos'}.`,
      );
      clearSelection();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Erro ao atribuir casos.',
      );
    }
  }

  async function handleAutoDistribute() {
    try {
      const result = await autoDistributeMutation.mutateAsync({
        statuses: ['WAITING_TRIAGE', 'IN_COLLECTION', 'NO_RESPONSE', 'ELIGIBLE_FOR_CANCELLATION'],
        targetRole: 'COLLECTION_AGENT',
      });
      toast.success(
        `${result.distributed} ${result.distributed === 1 ? 'caso distribuído' : 'casos distribuídos'} entre ${result.agents} ${result.agents === 1 ? 'agente' : 'agentes'}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Não foi possível distribuir os casos.',
      );
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Supervisão"
        description="Painel de distribuição, acompanhamento e governança operacional da carteira de cobrança."
        actions={
          <>
            {canDistribute ? (
              <Button
                variant="secondary"
                onClick={() => { void handleAutoDistribute(); }}
                disabled={autoDistributeMutation.isPending}
              >
                <Shuffle className="h-4 w-4" />
                {autoDistributeMutation.isPending ? 'Distribuindo...' : 'Distribuir automaticamente'}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => { void exportCsv({ ...listParams }); }}
              disabled={isExporting || casesQuery.isLoading}
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Button onClick={handleRetry} disabled={casesQuery.isLoading}>
              <RefreshCw className="h-4 w-4" />
              Atualizar carteira
            </Button>
          </>
        }
      />

      <SupervisionFilters
        filters={filters}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onFilterChange={updateFilters}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {!casesQuery.isLoading && !casesQuery.isError ? (
        <CollectionCaseSnapshotStrip
          items={items}
          totalCases={casesQuery.data?.pagination.total}
        />
      ) : null}

      {casesQuery.isLoading ? <TableSkeleton rows={6} columns={5} /> : null}

      {casesQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar os casos"
          description="Não foi possível conectar ao servidor. Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length === 0 ? (
        <EmptyState
          title="Nenhum caso encontrado"
          description={
            hasActiveFilters
              ? 'Nenhum caso corresponde aos filtros aplicados. Ajuste os critérios ou limpe os filtros.'
              : 'A API não retornou casos de cobrança para exibição neste momento.'
          }
          actionLabel={hasActiveFilters ? 'Limpar filtros' : 'Atualizar'}
          onAction={hasActiveFilters ? handleClearFilters : handleRetry}
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length > 0 ? (
        <SupervisionCasesTable
          items={items}
          agents={agents}
          agentsLoading={agentsQuery.isLoading}
          workload={workloadQuery.data}
          canDistribute={canDistribute}
          page={filters.page}
          totalPages={totalPages}
          sortBy={filters.sortBy}
          sortDirection={filters.sortDirection}
          onPageChange={(page) => updateFilters({ page })}
          onSortChange={(sortBy, sortDirection) =>
            updateFilters({ sortBy, sortDirection, page: 1 })
          }
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      ) : null}

      {canDistribute ? (
        <BulkActionBar
          selectedCount={selectedIds.size}
          selectedCaseIds={Array.from(selectedIds)}
          agents={agents}
          workload={workloadQuery.data}
          onBulkAssign={(id) => { void handleBulkAssign(id); }}
          onClearSelection={clearSelection}
          isAssigning={bulkAssign.isPending}
        />
      ) : null}
    </PageContainer>
  );
}
