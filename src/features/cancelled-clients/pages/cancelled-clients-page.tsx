import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, TrendingUp, UserX } from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/auth-context';
import { CancelledClientsTable } from '@/features/cancelled-clients/components/cancelled-clients-table';
import { canReopenCancelled } from '@/features/cancelled-clients/utils/can-reopen-cancelled';
import { ReopenCancelledBar } from '@/features/cancelled-clients/components/reopen-cancelled-bar';
import { useReopenCancelled } from '@/features/cancelled-clients/hooks/use-reopen-cancelled';
import { useCancellationReasons } from '@/features/dashboard/hooks/use-cancellation-reasons';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { useUsers } from '@/features/users/hooks/use-users';
import { useUsersWorkload } from '@/features/users/hooks/use-users-workload';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';
import { formatInteger } from '@/utils/formatters';

const DEFAULT_LIMIT = 10;

type View = 'cancelled' | 'reactivated';

const VIEWS: Array<{ key: View; label: string }> = [
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'reactivated', label: 'Reativados' },
];

const CANCELLED_STATUSES = ['CLOSED', 'CANCELLED_IN_RECOVERY'];

export default function CancelledClientsPage() {
  const { session } = useAuth();
  // Só supervisão/administração devolve cancelados às carteiras.
  const canDistribute =
    session?.user.roles.some(
      (role) => role === 'ADMIN' || role === 'SUPERVISOR',
    ) ?? false;

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>('cancelled');
  const [situation, setSituation] = useState('');
  const [reason, setReason] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const reopenMutation = useReopenCancelled();

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [debouncedSearch, view, situation, reason]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const listParams = useMemo(
    () =>
      view === 'reactivated'
        ? {
            reactivated: true,
            search: debouncedSearch.trim() || undefined,
            page,
            limit: DEFAULT_LIMIT,
          }
        : {
            // Só contratos de fato cancelados no ERP: casos encerrados por
            // outro motivo (ex.: duplicados) não são "cancelados".
            ...(situation
              ? { status: situation }
              : { statusIn: CANCELLED_STATUSES }),
            contractStatus: 'CANCELLED',
            cancellationReason: reason || undefined,
            search: debouncedSearch.trim() || undefined,
            page,
            limit: DEFAULT_LIMIT,
          },
    [debouncedSearch, page, reason, situation, view],
  );

  const casesQuery = useCollectionCases(listParams);
  const closedQuery = useCollectionCases({
    status: 'CLOSED',
    contractStatus: 'CANCELLED',
    limit: 1,
  });
  const inRecoveryQuery = useCollectionCases({
    status: 'CANCELLED_IN_RECOVERY',
    limit: 1,
  });
  const reactivatedQuery = useCollectionCases({ reactivated: true, limit: 1 });
  const withRevenueQuery = useCollectionCases({
    reactivated: true,
    status: 'RECOVERED',
    limit: 1,
  });

  // Atendentes ativos de cobrança ou cancelamento que podem receber a carteira.
  const usersQuery = useUsers({
    status: 'ACTIVE',
    limit: 100,
    enabled: canDistribute,
  });
  const agents = useMemo(
    () =>
      (usersQuery.data?.items ?? []).filter((user) =>
        user.roles.some(
          (role) =>
            role === 'COLLECTION_AGENT' || role === 'CANCELLATION_AGENT',
        ),
      ),
    [usersQuery.data],
  );
  const workloadQuery = useUsersWorkload(canDistribute);

  const reasonsQuery = useCancellationReasons();
  const reasonOptions = reasonsQuery.data?.allReasons ?? [];

  const items = useMemo(() => casesQuery.data?.items ?? [], [casesQuery.data]);
  const totalPages = Math.max(casesQuery.data?.pagination.totalPages ?? 1, 1);
  const closedTotal = closedQuery.data?.pagination.total ?? 0;
  const inRecoveryTotal = inRecoveryQuery.data?.pagination.total ?? 0;
  const reactivatedTotal = reactivatedQuery.data?.pagination.total ?? 0;
  const withRevenueTotal = withRevenueQuery.data?.pagination.total ?? 0;

  const handleRetry = useCallback(() => {
    void casesQuery.refetch();
  }, [casesQuery]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((previous) => {
      const reopenable = items.filter(canReopenCancelled);
      const allOnPage =
        reopenable.length > 0 && reopenable.every((i) => previous.has(i.id));

      return allOnPage ? new Set() : new Set(reopenable.map((i) => i.id));
    });
  }, [items]);

  async function handleReopen(assignedUserId: string) {
    try {
      const result = await reopenMutation.mutateAsync({
        caseIds: Array.from(selectedIds),
        assignedUserId,
      });
      toast.success(
        `${result.reopened} ${result.reopened === 1 ? 'cliente devolvido' : 'clientes devolvidos'} à carteira.${result.skipped > 0 ? ` ${result.skipped} ignorado(s): não estavam encerrados.` : ''}`,
      );
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível devolver os clientes à carteira.',
      );
    }
  }

  const hasSearch = debouncedSearch.trim().length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="Cancelados"
        description="Todos os clientes cancelados que passaram pela plataforma. A supervisão pode devolvê-los a uma carteira; só viram recuperados quando o ERP mostrar o contrato ativo de novo."
        actions={
          <Button onClick={handleRetry} disabled={casesQuery.isLoading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 card-stagger">
        <MetricCard
          title="Cancelados"
          value={formatInteger(closedTotal)}
          description="Encerrados, sem carteira"
          icon={UserX}
          variant="neutral"
          loading={closedQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Em recuperação"
          value={formatInteger(inRecoveryTotal)}
          description="Na carteira de um atendente"
          icon={RefreshCw}
          variant="warning"
          loading={inRecoveryQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Reativados"
          value={formatInteger(reactivatedTotal)}
          description={`${formatInteger(withRevenueTotal)} com receita para o atendente`}
          icon={TrendingUp}
          variant="success"
          loading={reactivatedQuery.isLoading || withRevenueQuery.isLoading}
          density="compact"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div
          role="group"
          aria-label="Visão"
          className="inline-flex rounded-lg border border-border bg-card p-0.5"
        >
          {VIEWS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={view === option.key}
              onClick={() => setView(option.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === option.key
                  ? 'bg-primary/15 text-foreground'
                  : 'text-neutral hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="min-w-[240px] flex-1 space-y-1 text-sm md:max-w-md">
          <span className="text-xs font-medium text-neutral">Busca</span>
          <Input
            placeholder="Cliente, documento ou contrato"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>

        {view === 'cancelled' ? (
          <label className="w-64 space-y-1 text-sm">
            <span className="text-xs font-medium text-neutral">
              Motivo do cancelamento
            </span>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Todos os motivos</option>
              {reasonOptions.map((option) => (
                <option key={option.reason} value={option.reason}>
                  {option.reason} ({formatInteger(option.count)})
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        {view === 'cancelled' ? (
          <label className="w-56 space-y-1 text-sm">
            <span className="text-xs font-medium text-neutral">Situação</span>
            <Select
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="CLOSED">Sem carteira</option>
              <option value="CANCELLED_IN_RECOVERY">Em recuperação</option>
            </Select>
          </label>
        ) : null}
      </div>

      {casesQuery.isLoading ? <TableSkeleton rows={6} columns={7} /> : null}

      {casesQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar os cancelados"
          description="Não foi possível conectar ao servidor. Tente novamente."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length === 0 ? (
        <EmptyState
          title={
            view === 'reactivated'
              ? 'Nenhum reativado encontrado'
              : 'Nenhum cancelado encontrado'
          }
          description={
            hasSearch
              ? 'Nenhum caso corresponde à busca.'
              : view === 'reactivated'
                ? 'Quando o ERP reativar um contrato devolvido à carteira, ele aparece aqui.'
                : 'Não há clientes cancelados no momento.'
          }
          actionLabel={hasSearch ? 'Limpar busca' : 'Atualizar'}
          onAction={hasSearch ? () => setSearchInput('') : handleRetry}
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length > 0 ? (
        <CancelledClientsTable
          items={items}
          selectable={canDistribute && view === 'cancelled'}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      ) : null}

      {canDistribute ? (
        <ReopenCancelledBar
          selectedCount={selectedIds.size}
          agents={agents}
          workload={workloadQuery.data}
          isSubmitting={reopenMutation.isPending}
          onConfirm={(assignedUserId) => {
            void handleReopen(assignedUserId);
          }}
          onClear={() => setSelectedIds(new Set())}
        />
      ) : null}
    </PageContainer>
  );
}
