import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Shuffle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { BulkActionBar } from '@/components/data-display/bulk-action-bar';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import {
  ActionsMenu,
  type ActionsMenuItem,
} from '@/components/ui/actions-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/auth-context';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { useBulkAssignCases } from '@/features/collection-cases/hooks/use-bulk-assign-cases';
import { useAutoDistribute } from '@/features/collection-cases/hooks/use-auto-distribute';
import { useExportCasesCsv } from '@/features/collection-cases/hooks/use-export-cases-csv';
import {
  type CollectionCasesSortBy,
  type CollectionCasesSortDirection,
} from '@/features/collection-cases/types/collection-cases-api.types';
import { getPriorityLabel } from '@/features/collection-cases/utils/collection-case-labels';
import { CancellationsTable } from '@/features/cancellations/components/cancellations-table';
import { useUsers } from '@/features/users/hooks/use-users';
import { useUsersWorkload } from '@/features/users/hooks/use-users-workload';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';
import { cn } from '@/lib/utils';
import { formatInteger, formatPercentRate } from '@/utils/formatters';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const DEFAULT_LIMIT = 10;

const STATUS_SEGMENTS = [
  { value: 'CANCELLATION_IN_PROGRESS', label: 'Em andamento' },
  { value: 'RECOVERED', label: 'Retidos' },
  { value: 'CLOSED', label: 'Encerrados' },
] as const;

type CancellationsFilters = {
  status: string;
  priority: string;
  search: string;
  sortBy: CollectionCasesSortBy | '';
  sortDirection: CollectionCasesSortDirection;
  page: number;
};

function parseFilters(params: URLSearchParams): CancellationsFilters {
  const sortBy = params.get('sortBy');
  const sortDirection = params.get('sortDirection');
  const status = params.get('status') ?? 'CANCELLATION_IN_PROGRESS';

  return {
    status:
      status === 'CLOSED' ||
      status === 'RECOVERED' ||
      status === 'CANCELLATION_IN_PROGRESS'
        ? status
        : 'CANCELLATION_IN_PROGRESS',
    priority: params.get('priority') ?? '',
    search: params.get('search') ?? '',
    sortBy:
      sortBy === 'daysOverdue' ||
      sortBy === 'totalOutstanding' ||
      sortBy === 'slaDueAt' ||
      sortBy === 'createdAt'
        ? sortBy
        : '',
    sortDirection: sortDirection === 'asc' ? 'asc' : 'desc',
    page: Math.max(Number(params.get('page')) || 1, 1),
  };
}

function filtersToSearchParams(filters: CancellationsFilters) {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== 'CANCELLATION_IN_PROGRESS') {
    params.set('status', filters.status);
  }

  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
    params.set('sortDirection', filters.sortDirection);
  }
  if (filters.page > 1) params.set('page', String(filters.page));

  return params;
}

export default function CancellationsPage() {
  const { session } = useAuth();
  const canDistribute =
    session?.user.roles.some((r) => r === 'ADMIN' || r === 'SUPERVISOR') ??
    false;

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const updateFilters = useCallback(
    (changes: Partial<CancellationsFilters>) => {
      const next = { ...filters, ...changes };
      setSearchParams(filtersToSearchParams(next), { replace: true });
    },
    [filters, setSearchParams],
  );

  useEffect(() => {
    const nextSearch = debouncedSearch.trim();
    if (nextSearch === filters.search.trim()) return;
    if (searchInput.trim() === '' && filters.search.trim() === '') return;
    updateFilters({ search: nextSearch, page: 1 });
  }, [debouncedSearch, filters.search, searchInput, updateFilters]);

  // Clear selection on page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters.page]);

  const listParams = useMemo(
    () => ({
      page: filters.page,
      limit: DEFAULT_LIMIT,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      search: debouncedSearch.trim() || undefined,
      sortBy: filters.sortBy || undefined,
      sortDirection: filters.sortBy ? filters.sortDirection : undefined,
    }),
    [filters, debouncedSearch],
  );

  const casesQuery = useCollectionCases(listParams);
  const inProgressQuery = useCollectionCases({
    status: 'CANCELLATION_IN_PROGRESS',
    limit: 1,
  });
  const closedQuery = useCollectionCases({ status: 'CLOSED', limit: 1 });
  const recoveredQuery = useCollectionCases({ status: 'RECOVERED', limit: 1 });

  const agentsQuery = useUsers({
    status: 'ACTIVE',
    role: 'CANCELLATION_AGENT',
    limit: 100,
    enabled: canDistribute,
  });
  const agents = agentsQuery.data?.items ?? [];
  const workloadQuery = useUsersWorkload(canDistribute);

  const bulkAssign = useBulkAssignCases();
  const autoDistributeMutation = useAutoDistribute();
  const { exportCsv, isExporting } = useExportCasesCsv();

  const handleRetry = () => {
    void casesQuery.refetch();
  };

  const items = useMemo(() => casesQuery.data?.items ?? [], [casesQuery.data]);
  const totalPages = Math.max(casesQuery.data?.pagination.totalPages ?? 1, 1);

  const inProgressTotal = inProgressQuery.data?.pagination.total ?? 0;
  const closedTotal = closedQuery.data?.pagination.total ?? 0;
  const recoveredTotal = recoveredQuery.data?.pagination.total ?? 0;
  const completedTotal = closedTotal + recoveredTotal;
  const recoveryRate = completedTotal > 0 ? recoveredTotal / completedTotal : 0;

  const hasActiveFilters =
    filters.status !== 'CANCELLATION_IN_PROGRESS' ||
    Boolean(filters.priority) ||
    Boolean(filters.search.trim());

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

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
          ? `${result.assigned} ${result.assigned === 1 ? 'processo atribuído' : 'processos atribuídos'} com sucesso.`
          : `Atribuição removida de ${result.assigned} ${result.assigned === 1 ? 'processo' : 'processos'}.`,
      );
      clearSelection();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Erro ao atribuir processos.',
      );
    }
  }

  async function handleAutoDistribute() {
    try {
      const result = await autoDistributeMutation.mutateAsync({
        statuses: ['CANCELLATION_IN_PROGRESS'],
        targetRole: 'CANCELLATION_AGENT',
      });
      toast.success(
        `${result.distributed} ${result.distributed === 1 ? 'processo distribuído' : 'processos distribuídos'} entre ${result.agents} ${result.agents === 1 ? 'agente' : 'agentes'}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível distribuir os processos.',
      );
    }
  }

  const menuItems: ActionsMenuItem[] = [
    ...(canDistribute
      ? [
          {
            key: 'auto-distribute',
            label: autoDistributeMutation.isPending
              ? 'Distribuindo...'
              : 'Distribuir automaticamente',
            icon: <Shuffle className="h-4 w-4" aria-hidden="true" />,
            disabled: autoDistributeMutation.isPending,
            onSelect: () => {
              void handleAutoDistribute();
            },
          },
        ]
      : []),
    {
      key: 'export-csv',
      label: isExporting ? 'Exportando...' : 'Exportar CSV',
      icon: <Download className="h-4 w-4" aria-hidden="true" />,
      disabled: isExporting || casesQuery.isLoading,
      onSelect: () => {
        void exportCsv({ ...listParams });
      },
    },
  ];

  const segmentTotals: Record<string, number> = {
    CANCELLATION_IN_PROGRESS: inProgressTotal,
    RECOVERED: recoveredTotal,
    CLOSED: closedTotal,
  };

  return (
    <PageContainer>
      <PageHeader
        title="Cancelamentos"
        description="Monitoramento dos processos de cancelamento em andamento: responsável, prazo e evolução."
        actions={
          <>
            <ActionsMenu items={menuItems} />
            <Button onClick={handleRetry} disabled={casesQuery.isLoading}>
              Atualizar
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div
          role="group"
          aria-label="Situação dos processos"
          className="inline-flex rounded-lg border border-border bg-card p-0.5"
        >
          {STATUS_SEGMENTS.map((segment) => {
            const active = filters.status === segment.value;
            const total = segmentTotals[segment.value];

            return (
              <button
                key={segment.value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  updateFilters({ status: segment.value, page: 1 })
                }
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/15 text-foreground'
                    : 'text-neutral hover:text-foreground',
                )}
              >
                {segment.label}
                <span className="text-xs tabular-nums text-neutral">
                  {formatInteger(total ?? 0)}
                </span>
              </button>
            );
          })}
        </div>

        <p
          className="text-sm text-neutral"
          title={`${formatInteger(recoveredTotal)} de ${formatInteger(completedTotal)} finalizados`}
        >
          Taxa de recuperação{' '}
          <strong
            className={cn(
              'text-base font-semibold tabular-nums',
              recoveryRate >= 0.3 ? 'text-success' : 'text-danger',
            )}
          >
            {formatPercentRate(recoveryRate)}
          </strong>{' '}
          <span className="text-xs">
            ({formatInteger(recoveredTotal)} de {formatInteger(completedTotal)}{' '}
            finalizados)
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[240px] flex-1 space-y-1 text-sm md:max-w-md">
          <span className="text-xs font-medium text-neutral">Busca</span>
          <Input
            placeholder="Cliente, documento ou contrato"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>

        <label className="w-56 space-y-1 text-sm">
          <span className="text-xs font-medium text-neutral">Prioridade</span>
          <Select
            value={filters.priority}
            onChange={(e) =>
              updateFilters({ priority: e.target.value, page: 1 })
            }
          >
            <option value="">Todas as prioridades</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {getPriorityLabel(p)}
              </option>
            ))}
          </Select>
        </label>

        {hasActiveFilters ? (
          <Button variant="secondary" onClick={clearFilters}>
            Limpar filtros
          </Button>
        ) : null}
      </div>

      {casesQuery.isLoading ? <TableSkeleton rows={6} columns={5} /> : null}

      {casesQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar os processos"
          description="Não foi possível conectar ao servidor. Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length === 0 ? (
        <EmptyState
          title="Nenhum processo encontrado"
          description={
            hasActiveFilters
              ? 'Nenhum processo corresponde aos filtros aplicados.'
              : 'Não há processos de cancelamento no momento.'
          }
          actionLabel={hasActiveFilters ? 'Limpar filtros' : 'Atualizar'}
          onAction={hasActiveFilters ? clearFilters : handleRetry}
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length > 0 ? (
        <CancellationsTable
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
          onBulkAssign={(id) => {
            void handleBulkAssign(id);
          }}
          onClearSelection={clearSelection}
          isAssigning={bulkAssign.isPending}
        />
      ) : null}
    </PageContainer>
  );
}
