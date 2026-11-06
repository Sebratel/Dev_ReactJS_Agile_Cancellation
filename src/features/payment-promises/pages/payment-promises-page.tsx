import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  HandshakeIcon,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isInteractiveTarget } from '@/features/collection-cases/utils/case-row-presentation';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
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
  getCollectionStatusLabel,
  getCollectionStatusVariant,
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

const CASE_SITUATION_OPTIONS = [
  { value: '', label: 'Todas as situações' },
  { value: 'PAID', label: 'Já pagaram' },
  { value: 'RECOVERED', label: 'Pagou após contato do atendente' },
  { value: 'PAYMENT_MADE', label: 'Pagou sem contato' },
  { value: 'IN_COLLECTION', label: 'Em cobrança (ainda devem)' },
  { value: 'CANCELLATION', label: 'Em cancelamento' },
  { value: 'CLOSED', label: 'Encerrado' },
] as const;

type Filters = {
  status: string;
  caseSituation: string;
  search: string;
  from: string;
  to: string;
  page: number;
};

function parseFilters(params: URLSearchParams): Filters {
  return {
    status: params.get('status') ?? '',
    caseSituation: params.get('caseSituation') ?? '',
    search: params.get('search') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Math.max(Number(params.get('page')) || 1, 1),
  };
}

function filtersToSearchParams(f: Filters) {
  const p = new URLSearchParams();
  if (f.status) p.set('status', f.status);
  if (f.caseSituation) p.set('caseSituation', f.caseSituation);
  if (f.search.trim()) p.set('search', f.search.trim());
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  if (f.page > 1) p.set('page', String(f.page));
  return p;
}

export default function PaymentPromisesPage() {
  const navigate = useNavigate();
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
      status:
        (filters.status as PaymentPromisesListParams['status']) || undefined,
      caseSituation:
        (filters.caseSituation as PaymentPromisesListParams['caseSituation']) ||
        undefined,
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
    Boolean(filters.caseSituation) ||
    Boolean(filters.search.trim()) ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleRetry = () => {
    void listQuery.refetch();
  };

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
          description={
            summary && summary.overduePaid > 0
              ? `Ativas com data ultrapassada · ${formatInteger(summary.overduePaid)} já pagaram`
              : 'Ativas com data ultrapassada'
          }
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
          variant={
            summary && summary.brokenThisMonth > 0 ? 'warning' : 'neutral'
          }
          loading={summaryQuery.isLoading}
          density="compact"
        />
      </div>

      <SectionCard
        title="Filtros"
        description="Filtre por status da promessa, situação do caso (pagou ou não), período ou busca textual."
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
              onChange={(e) =>
                updateFilters({ status: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="FULFILLED">Cumpridas</option>
              <option value="BROKEN">Descumpridas</option>
              <option value="CANCELLED">Canceladas</option>
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-neutral">
              Situação do caso
            </span>
            <Select
              value={filters.caseSituation}
              onChange={(e) =>
                updateFilters({ caseSituation: e.target.value, page: 1 })
              }
            >
              {CASE_SITUATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-neutral">
              Data inicial
            </span>
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
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[27%]" />
                <col className="w-[19%]" />
                <col className="w-[13%]" />
                <col className="w-[19%]" />
                <col className="w-[16%]" />
                <col className="w-14" />
              </colgroup>
              <TableHead sticky>
                <tr>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Promessa</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Situação do caso</TableHeaderCell>
                  <TableHeaderCell>Responsável</TableHeaderCell>
                  <TableHeaderCell align="center">
                    <span className="sr-only">Ações</span>
                  </TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const detailPath = `/supervisao/${item.collectionCaseId}`;

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'cursor-pointer [&>td:first-child]:border-l-[3px]',
                        item.isOverdue
                          ? 'bg-danger/5 [&>td:first-child]:border-l-danger'
                          : '[&>td:first-child]:border-l-transparent',
                      )}
                      onClick={(event) => {
                        if (!isInteractiveTarget(event.target)) {
                          void navigate(detailPath);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="truncate">{item.customer.name}</div>
                        <div className="mt-0.5 text-xs font-normal text-neutral">
                          {item.customer.document} · {item.contract.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold tabular-nums">
                          {formatCurrencyFromDecimalString(item.promisedAmount)}
                        </div>
                        <div className="flex items-center gap-2 text-xs tabular-nums text-neutral">
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
                      <TableCell>
                        <StatusBadge
                          label={getCollectionStatusLabel(item.caseStatus)}
                          variant={getCollectionStatusVariant(item.caseStatus)}
                        />
                        {item.caseRecoveredAt ? (
                          <div className="mt-0.5 text-xs tabular-nums text-neutral">
                            em {formatDatePtBR(item.caseRecoveredAt)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-neutral">
                        {item.assignedTo?.name ?? (
                          <span className="italic text-neutral/60">
                            Não atribuído
                          </span>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Link
                          to={detailPath}
                          title="Ver caso"
                          aria-label={`Ver caso de ${item.customer.name}`}
                          className={buttonVariants({
                            variant: 'ghost',
                            size: 'sm',
                          })}
                        >
                          <ChevronRight
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
