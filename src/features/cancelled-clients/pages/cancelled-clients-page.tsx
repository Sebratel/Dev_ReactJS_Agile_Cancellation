import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  RefreshCw,
  TrendingUp,
  UserX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import { useRecoverCancelled } from '@/features/cancelled-clients/hooks/use-recover-cancelled';
import {
  getCollectionStatusLabel,
  getCollectionStatusVariant,
} from '@/features/collection-cases/utils/collection-case-labels';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api/api-error';
import {
  formatCurrencyFromDecimalString,
  formatDatePtBR,
  formatInteger,
} from '@/utils/formatters';
import type { CollectionCaseListItemResponse } from '@/features/collection-cases/types/collection-cases-api.types';

const DEFAULT_LIMIT = 10;

function ConfirmRecoverDialog({
  item,
  onConfirm,
  onCancel,
  isPending,
}: {
  item: CollectionCaseListItemResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-[2px]">
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-floating">
        <h2 className="mb-2 text-base font-bold">Marcar como Recuperado?</h2>
        <p className="mb-1 text-sm text-neutral">
          Cliente: <span className="font-medium text-foreground">{item.customerName}</span>
        </p>
        <p className="mb-4 text-sm text-neutral">
          Contrato: <span className="font-medium text-foreground">{item.contractCode}</span>
        </p>
        <p className="mb-6 text-sm text-neutral">
          Esta ação marcará o caso como <strong>Recuperado</strong> e registrará o evento de
          auditoria. Confirme apenas se o cliente foi reativado na Voalle após contato do
          atendente.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CancelledClientsPage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [page, setPage] = useState(1);
  const [confirmItem, setConfirmItem] = useState<CollectionCaseListItemResponse | null>(null);

  const recoverMutation = useRecoverCancelled();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const listParams = useMemo(
    () => ({
      status: 'CLOSED',
      search: debouncedSearch.trim() || undefined,
      page,
      limit: DEFAULT_LIMIT,
    }),
    [debouncedSearch, page],
  );

  const casesQuery = useCollectionCases(listParams);
  const recoveredQuery = useCollectionCases({ status: 'RECOVERED', limit: 1 });
  const closedQuery = useCollectionCases({ status: 'CLOSED', limit: 1 });

  const items = casesQuery.data?.items ?? [];
  const totalPages = Math.max(casesQuery.data?.pagination.totalPages ?? 1, 1);
  const closedTotal = closedQuery.data?.pagination.total ?? 0;
  const recoveredTotal = recoveredQuery.data?.pagination.total ?? 0;

  const handleRetry = useCallback(() => { void casesQuery.refetch(); }, [casesQuery]);

  async function handleConfirmRecover() {
    if (!confirmItem) return;
    try {
      await recoverMutation.mutateAsync(confirmItem.id);
      toast.success(`${confirmItem.customerName} marcado como Recuperado.`);
      setConfirmItem(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Não foi possível marcar o caso como recuperado.',
      );
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Cancelados"
        description="Clientes cujo cancelamento foi concluído. Marque como Recuperado quando o cliente reativar o contrato."
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
          description="Cancelamentos concluídos"
          icon={UserX}
          variant="neutral"
          loading={closedQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Recuperados"
          value={formatInteger(recoveredTotal)}
          description="Cancelados que voltaram"
          icon={TrendingUp}
          variant="success"
          loading={recoveredQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Taxa de recuperação"
          value={
            closedTotal + recoveredTotal > 0
              ? `${Math.round((recoveredTotal / (closedTotal + recoveredTotal)) * 100)}%`
              : '0%'
          }
          description={`${formatInteger(recoveredTotal)} de ${formatInteger(closedTotal + recoveredTotal)} finalizados`}
          icon={CheckCircle}
          variant={recoveredTotal / Math.max(closedTotal + recoveredTotal, 1) >= 0.1 ? 'success' : 'neutral'}
          loading={closedQuery.isLoading || recoveredQuery.isLoading}
          density="compact"
        />
      </div>

      <SectionCard
        title="Filtros"
        contentClassName="p-4"
      >
        <label className="block max-w-sm space-y-1 text-sm">
          <span className="text-xs font-medium text-neutral">Busca</span>
          <Input
            placeholder="Cliente, documento ou contrato"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
      </SectionCard>

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
          title="Nenhum cancelado encontrado"
          description={
            debouncedSearch.trim()
              ? 'Nenhum caso corresponde à busca.'
              : 'Não há clientes cancelados no momento.'
          }
          actionLabel={debouncedSearch.trim() ? 'Limpar busca' : 'Atualizar'}
          onAction={debouncedSearch.trim() ? () => setSearchInput('') : handleRetry}
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length > 0 ? (
        <SectionCard
          title="Clientes cancelados"
          description="Cancelamentos concluídos com histórico de cobrança."
          contentClassName="p-0"
        >
          <TableContainer flush className="max-h-[70vh] overflow-y-auto">
            <Table className="min-w-[960px]">
              <TableHead sticky>
                <tr>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Contrato</TableHeaderCell>
                  <TableHeaderCell align="center">Dias em atraso</TableHeaderCell>
                  <TableHeaderCell align="center">Valor em aberto</TableHeaderCell>
                  <TableHeaderCell>Motivo</TableHeaderCell>
                  <TableHeaderCell>Atribuído em</TableHeaderCell>
                  <TableHeaderCell>Responsável</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Ação</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.customerName}</TableCell>
                      <TableCell className="text-neutral">{item.contractCode}</TableCell>
                      <TableCell align="center" className="tabular-nums">
                        {formatInteger(item.daysOverdue)}
                      </TableCell>
                      <TableCell align="center" className="font-medium tabular-nums">
                        {formatCurrencyFromDecimalString(item.outstandingAmount)}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm text-neutral">
                        {item.contractCancellationReason ?? '—'}
                      </TableCell>
                      <TableCell className="text-neutral">
                        {item.assignedAt ? formatDatePtBR(item.assignedAt) : '—'}
                      </TableCell>
                      <TableCell className="text-neutral">
                        {item.assignedTo?.name ?? 'Não atribuído'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={getCollectionStatusLabel(item.status)}
                          variant={getCollectionStatusVariant(item.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/cancelados/${item.id}`}
                            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
                          >
                            Ver
                          </Link>
                          {item.totalAttempts > 0 ? (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setConfirmItem(item)}
                              disabled={recoverMutation.isPending}
                            >
                              Recuperado
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="border-t border-border px-4 py-4 lg:px-6"
          />
        </SectionCard>
      ) : null}

      {confirmItem ? (
        <ConfirmRecoverDialog
          item={confirmItem}
          onConfirm={() => { void handleConfirmRecover(); }}
          onCancel={() => setConfirmItem(null)}
          isPending={recoverMutation.isPending}
        />
      ) : null}
    </PageContainer>
  );
}
