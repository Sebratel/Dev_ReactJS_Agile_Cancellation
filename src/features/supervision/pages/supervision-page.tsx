import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  LayoutGrid,
  List,
  RefreshCw,
  Repeat,
  Shuffle,
  X,
} from 'lucide-react';
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
import { SyncHealthBanner } from '@/features/supervision/components/sync-health-banner';
import { RecoveryNotificationsInfo } from '@/features/supervision/components/recovery-notifications-info';
import { SupervisionPortfolios } from '@/features/supervision/components/supervision-portfolios';
import { SupervisionRenegotiated } from '@/features/supervision/components/supervision-renegotiated';
import { SupervisionFilters } from '@/features/supervision/components/supervision-filters';
import { useCollectionCasePortfolios } from '@/features/collection-cases/hooks/use-collection-case-portfolios';
import { useRenegotiatedHistory } from '@/features/collection-cases/hooks/use-renegotiated-history';
import { useSupervisionSearchParams } from '@/features/supervision/hooks/use-supervision-search-params';
import {
  hasActiveSupervisionFilters,
  supervisionFiltersToListParams,
} from '@/features/supervision/utils/supervision-search-params';
import { useUsers } from '@/features/users/hooks/use-users';
import { useUsersWorkload } from '@/features/users/hooks/use-users-workload';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api/api-error';

const INTERACTION_SEGMENTS = [
  { value: '', label: 'Todos' },
  { value: 'contacted', label: 'Já contatados' },
  { value: 'not_contacted', label: 'Não contatados' },
] as const;

export default function SupervisionPage() {
  const { session } = useAuth();
  const canDistribute =
    session?.user.roles.some((r) => r === 'ADMIN' || r === 'SUPERVISOR') ?? false;

  const { filters, updateFilters, clearFilters } = useSupervisionSearchParams();
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Painel de carteiras: modo de visualizacao e carteira selecionada. Sao
  // estado local (nao vao pra URL) para nao poluir os filtros compartilhados.
  // `selectedAgentId` = id do atendente, 'unassigned' (sem responsavel) ou null.
  // A view padrao e Carteiras, mas quem nao pode distribuir so ve a Lista
  // (derivamos a view efetiva em vez de travar no init, pois a sessao — e
  // portanto canDistribute — pode nao estar pronta no primeiro render).
  const [view, setView] = useState<'portfolios' | 'list' | 'renegotiated'>(
    'portfolios',
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const effectiveView = canDistribute ? view : 'list';

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

  const listParams = useMemo(() => {
    const base = supervisionFiltersToListParams(filters, debouncedSearch);
    return selectedAgentId
      ? { ...base, assignedToId: selectedAgentId }
      : base;
  }, [filters, debouncedSearch, selectedAgentId]);

  const casesQuery = useCollectionCases(listParams, { autoRefresh: true });

  const portfoliosQuery = useCollectionCasePortfolios(canDistribute);
  const renegotiatedQuery = useRenegotiatedHistory(
    canDistribute && view === 'renegotiated',
  );

  const handleSelectPortfolio = useCallback(
    (agentId: string | null) => {
      setSelectedAgentId(agentId ?? 'unassigned');
      updateFilters({ page: 1 });
      setView('list');
    },
    [updateFilters],
  );

  const clearPortfolioSelection = useCallback(() => {
    setSelectedAgentId(null);
    updateFilters({ page: 1 });
  }, [updateFilters]);

  const agentsQuery = useUsers({
    status: 'ACTIVE',
    role: 'COLLECTION_AGENT',
    limit: 100,
    enabled: canDistribute,
  });
  const agents = agentsQuery.data?.items ?? [];
  const workloadQuery = useUsersWorkload(canDistribute);

  const selectedAgentName = useMemo(() => {
    if (!selectedAgentId) return null;
    if (selectedAgentId === 'unassigned') return 'Sem responsável';
    return (
      agentsQuery.data?.items.find((a) => a.id === selectedAgentId)?.name ??
      portfoliosQuery.data?.portfolios.find(
        (p) => p.agent?.id === selectedAgentId,
      )?.agent?.name ??
      'Atendente'
    );
  }, [selectedAgentId, agentsQuery.data, portfoliosQuery.data]);

  const bulkAssign = useBulkAssignCases();
  const autoDistributeMutation = useAutoDistribute();
  const { exportCsv, isExporting } = useExportCasesCsv();

  // Atualiza a VISAO ATIVA: carteiras, lista ou renegociados — nao so a lista.
  const handleRetry = () => {
    if (canDistribute && effectiveView === 'portfolios') {
      void portfoliosQuery.refetch();
      return;
    }
    if (canDistribute && effectiveView === 'renegotiated') {
      void renegotiatedQuery.refetch();
      return;
    }
    void casesQuery.refetch();
  };

  const isRefreshing =
    effectiveView === 'portfolios'
      ? portfoliosQuery.isFetching
      : effectiveView === 'renegotiated'
        ? renegotiatedQuery.isFetching
        : casesQuery.isFetching;

  const items = useMemo(() => casesQuery.data?.items ?? [], [casesQuery.data]);
  const totalPages = Math.max(casesQuery.data?.pagination.totalPages ?? 1, 1);

  // Com auto-refresh a lista pode encolher (casos saem da carteira): se a pagina
  // atual deixou de existir, volta para a ultima valida.
  const { isPlaceholderData } = casesQuery;
  useEffect(() => {
    if (isPlaceholderData || !casesQuery.data) return;
    if (filters.page > totalPages) {
      updateFilters({ page: totalPages });
    }
  }, [isPlaceholderData, casesQuery.data, filters.page, totalPages, updateFilters]);
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
            {canDistribute ? <RecoveryNotificationsInfo /> : null}
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
            <Button onClick={handleRetry} disabled={isRefreshing}>
              <RefreshCw
                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
              />
              {isRefreshing ? 'Atualizando...' : 'Atualizar carteira'}
            </Button>
          </>
        }
      />

      {canDistribute ? <SyncHealthBanner /> : null}

      {canDistribute ? (
        <div className="flex self-start rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setView('portfolios')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              effectiveView === 'portfolios'
                ? 'bg-primary text-primary-foreground'
                : 'text-neutral hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Carteiras
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              effectiveView === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-neutral hover:text-foreground',
            )}
          >
            <List className="h-4 w-4" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setView('renegotiated')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              effectiveView === 'renegotiated'
                ? 'bg-primary text-primary-foreground'
                : 'text-neutral hover:text-foreground',
            )}
          >
            <Repeat className="h-4 w-4" />
            Renegociados
          </button>
        </div>
      ) : null}

      {canDistribute && effectiveView === 'renegotiated' ? (
        <SupervisionRenegotiated
          data={renegotiatedQuery.data}
          isLoading={renegotiatedQuery.isLoading}
          isError={renegotiatedQuery.isError}
          onRetry={() => {
            void renegotiatedQuery.refetch();
          }}
        />
      ) : null}

      {canDistribute && effectiveView === 'portfolios' ? (
        portfoliosQuery.isError ? (
          <ErrorState
            title="Não foi possível carregar as carteiras"
            description="Não foi possível conectar ao servidor. Tente novamente."
            retryLabel="Tentar novamente"
            onRetry={() => {
              void portfoliosQuery.refetch();
            }}
          />
        ) : (
          <SupervisionPortfolios
            portfolios={portfoliosQuery.data?.portfolios ?? []}
            agents={agents}
            isLoading={portfoliosQuery.isLoading}
            onSelectAgent={handleSelectPortfolio}
          />
        )
      ) : null}

      {effectiveView === 'list' ? (
        <>
          {selectedAgentName ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
              <span className="text-sm">
                Mostrando a carteira de{' '}
                <span className="font-semibold">{selectedAgentName}</span>
              </span>
              <button
                type="button"
                onClick={clearPortfolioSelection}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <X className="h-3.5 w-3.5" />
                Ver todos
              </button>
            </div>
          ) : null}

          <SupervisionFilters
            filters={filters}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onFilterChange={updateFilters}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          <div
            role="tablist"
            aria-label="Segmento por contato do atendente"
            className="flex flex-wrap gap-2"
          >
            {INTERACTION_SEGMENTS.map((option) => {
              const active = filters.interactionStatus === option.value;
              return (
                <button
                  key={option.value || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() =>
                    updateFilters({
                      interactionStatus: option.value,
                      page: 1,
                    })
                  }
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-neutral hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

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
        </>
      ) : null}
    </PageContainer>
  );
}
