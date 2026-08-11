import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HandshakeIcon,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import {
  getPromiseStatusLabel,
  getPromiseStatusVariant,
} from '@/features/collection-cases/utils/collection-case-labels';
import { usePaymentPromises } from '@/features/payment-promises/hooks/use-payment-promises';
import { usePaymentPromisesSummary } from '@/features/payment-promises/hooks/use-payment-promises-summary';
import { type PaymentPromisesListParams } from '@/features/payment-promises/types/payment-promises-api.types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import {
  formatCurrencyFromDecimalString,
  formatDatePtBR,
  formatInteger,
} from '@/utils/formatters';

const DEFAULT_LIMIT = 20;

type Filters = {
  status: string;
  search: string;
  from: string;
  to: string;
  page: number;
};

function parseFilters(params: URLSearchParams): Filters {
  return {
    status: params.get('status') ?? '',
    search: params.get('search') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Math.max(Number(params.get('page')) || 1, 1),
  };
}

function filtersToSearchParams(f: Filters) {
  const p = new URLSearchParams();
  if (f.status) p.set('status', f.status);
  if (f.search.trim()) p.set('search', f.search.trim());
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  if (f.page > 1) p.set('page', String(f.page));
  return p;
}

export default function PaymentPromisesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const updateFilters = useCallback(
    (changes: Partial<Filters>) => {
      const next = { ...filters, ...changes };
      setSearchParams(filtersToSearchParams(next), { replace: true });
    },
    [filters, setSearchParams],
  );

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === filters.search.trim()) return;
    if (searchInput.trim() === '' && filters.search.trim() === '') return;
    updateFilters({ search: next, page: 1 });
  }, [debouncedSearch, filters.search, searchInput, updateFilters]);

  const listParams: PaymentPromisesListParams = useMemo(
    () => ({
      status: (filters.status as PaymentPromisesListParams['status']) || undefined,
      search: debouncedSearch.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page: filters.page,
      limit: DEFAULT_LIMIT,
    }),
    [filters, debouncedSearch],
  );

  const listQuery = usePaymentPromises(listParams);
  const summaryQuery = usePaymentPromisesSummary();

  const items = listQuery.data?.items ?? [];
  const totalPages = Math.max(listQuery.data?.pagination.totalPages ?? 1, 1);
  const summary = summaryQuery.data;

  const hasActiveFilters =
    Boolean(filters.status) ||
    Boolean(filters.search.trim()) ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleRetry = () => { void listQuery.refetch(); };

  return (
    <PageContainer>
      <PageHeader
        title="Promessas de Pagamento"
        description="Monitoramento global de acordos ativos, vencidos e histórico de cumprimento."
        actions={
          <Button onClick={handleRetry} disabled={listQuery.isLoading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 card-stagger">
        <MetricCard
          title="Promessas ativas"
          value={formatInteger(summary?.active ?? 0)}
          description="Acordos aguardando cumprimento"
          icon={HandshakeIcon}
          variant="neutral"
          loading={summaryQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Vencidas"
          value={formatInteger(summary?.overdue ?? 0)}
          description="Ativas com data ultrapassada"
          icon={AlertTriangle}
          variant={summary && summary.overdue > 0 ? 'danger' : 'neutral'}
          loading={summaryQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Cumpridas este mês"
          value={formatInteger(summary?.fulfilledThisMonth ?? 0)}
          description="Acordos honrados no mês atual"
          icon={CheckCircle2}
          variant="success"
          loading={summaryQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Descumpridas este mês"
          value={formatInteger(summary?.brokenThisMonth ?? 0)}
          description="Acordos não honrados no mês atual"
          icon={XCircle}
          variant={summary && summary.brokenThisMonth > 0 ? 'warning' : 'neutral'}
          loading={summaryQuery.isLoading}
          density="compact"
        />
      </div>

      <SectionCard
        title="Filtros"
        description="Filtre por status, período ou busca textual."
        contentClassName="space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-neutral">Busca</span>
            <Input
              placeholder="Cliente, documento ou contrato"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-neutral">Status</span>
            <Select
              value={filters.status}
              onChange={(e) => updateFilters({ status: e.target.value, page: 1 })}
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="FULFILLED">Cumpridas</option>
              <option value="BROKEN">Descumpridas</option>
              <option value="CANCELLED">Canceladas</option>
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-neutral">Data inicial</span>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => updateFilters({ from: e.target.value, page: 1 })}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-neutral">Data final</span>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => updateFilters({ to: e.target.value, page: 1 })}
            />
          </label>
        </div>

        {hasActiveFilters ? (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        ) : null}
      </SectionCard>

      {listQuery.isLoading ? <TableSkeleton rows={6} columns={6} /> : null}

      {listQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar as promessas"
          description="Verifique a conexão com o servidor e tente novamente."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
        <EmptyState
          title="Nenhuma promessa encontrada"
          description={
            hasActiveFilters
              ? 'Nenhuma promessa corresponde aos filtros aplicados.'
              : 'Não há promessas de pagamento registradas.'
          }
          actionLabel={hasActiveFilters ? 'Limpar filtros' : 'Atualizar'}
          onAction={hasActiveFilters ? clearFilters : handleRetry}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && items.length > 0 ? (
        <SectionCard
          title="Promessas"
          description={`${listQuery.data?.pagination.total ?? 0} ${(listQuery.data?.pagination.total ?? 0) === 1 ? 'promessa encontrada' : 'promessas encontradas'}`}
          contentClassName="p-0"
        >
          <TableContainer flush className="max-h-[70vh] overflow-y-auto">
            <Table className="min-w-[860px]">
              <TableHead sticky>
                <tr>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Contrato</TableHeaderCell>
                  <TableHeaderCell align="right">Valor prometido</TableHeaderCell>
                  <TableHeaderCell>Data prometida</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Responsável</TableHeaderCell>
                  <TableHeaderCell>Ação</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(item.isOverdue && 'bg-danger/5')}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <p>{item.customer.name}</p>
                        <p className="text-xs text-neutral">{item.customer.document}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral">
                      {item.contract.code}
                    </TableCell>
                    <TableCell align="right" className="font-medium tabular-nums">
                      {formatCurrencyFromDecimalString(item.promisedAmount)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <div className="flex items-center gap-2">
                        {formatDatePtBR(item.promisedDate)}
                        {item.isOverdue ? (
                          <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                            Vencida
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={getPromiseStatusLabel(item.status)}
                        variant={getPromiseStatusVariant(item.status)}
                      />
                    </TableCell>
                    <TableCell className="text-neutral">
                      {item.assignedTo?.name ?? (
                        <span className="italic text-neutral/60">Não atribuído</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/supervisao/${item.collectionCaseId}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Ver caso
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Pagination
            page={filters.page}
            totalPages={totalPages}
            onPageChange={(page) => updateFilters({ page })}
            className="border-t border-border px-4 py-4 lg:px-6"
          />
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
