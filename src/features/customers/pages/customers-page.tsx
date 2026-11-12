import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isInteractiveTarget } from '@/features/collection-cases/utils/case-row-presentation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  FileText,
  WalletCards,
} from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
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
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCustomers } from '@/features/customers/hooks/use-customers';
import {
  type CustomersSortBy,
  type CustomersSortDirection,
} from '@/features/customers/types/customers-api.types';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

const PAGE_SIZE = 20;

type SortableColumn = {
  key: CustomersSortBy;
  label: string;
};

const NUMERIC_SORTABLE_COLUMNS: SortableColumn[] = [
  { key: 'contractsCount', label: 'Contratos' },
  { key: 'openInvoicesCount', label: 'Faturas em aberto' },
  { key: 'overdueAmount', label: 'Vencido' },
  { key: 'totalOutstanding', label: 'Total em aberto' },
];

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: CustomersSortDirection;
}) {
  if (!active) {
    return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-neutral" />;
  }

  return direction === 'asc' ? (
    <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const tableShellRef = useRef<HTMLDivElement>(null);
  const lastPageChangePosition = useRef<{
    windowY: number;
    tableY: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [sortBy, setSortBy] = useState<CustomersSortBy>('name');
  const [sortDirection, setSortDirection] =
    useState<CustomersSortDirection>('asc');

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      sortBy,
      sortDirection,
    }),
    [page, debouncedSearch, sortBy, sortDirection],
  );

  const customersQuery = useCustomers(params);

  const items = useMemo(
    () => customersQuery.data?.items ?? [],
    [customersQuery.data],
  );
  const totalCustomers = customersQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(
    customersQuery.data?.pagination.totalPages ?? 1,
    1,
  );
  const hasSearch = debouncedSearch.trim().length > 0;
  const pageOpenInvoices = items.reduce(
    (sum, customer) => sum + customer.openInvoicesCount,
    0,
  );
  const pageOverdueCustomers = items.filter(
    (customer) => customer.overdueInvoicesCount > 0,
  ).length;
  const pageOutstandingAmount = items.reduce(
    (sum, customer) => sum + Number(customer.totalOutstanding ?? 0),
    0,
  );

  const handleRetry = () => {
    void customersQuery.refetch();
  };

  const handleSort = (column: CustomersSortBy) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    const tableContainer = tableShellRef.current?.querySelector<HTMLDivElement>(
      '[data-customers-table-scroll]',
    );
    lastPageChangePosition.current = {
      windowY: window.scrollY,
      tableY: tableContainer?.scrollTop ?? 0,
    };
    setPage(nextPage);
  };

  useLayoutEffect(() => {
    const position = lastPageChangePosition.current;
    if (!position) return;

    const restorePosition = () => {
      const tableContainer =
        tableShellRef.current?.querySelector<HTMLDivElement>(
          '[data-customers-table-scroll]',
        );
      if (tableContainer) {
        tableContainer.scrollTop = position.tableY;
      }

      const isJsdom = navigator.userAgent.toLowerCase().includes('jsdom');
      if (isJsdom) {
        document.documentElement.scrollTop = position.windowY;
        document.body.scrollTop = position.windowY;
        lastPageChangePosition.current = null;
        return;
      }

      try {
        window.scrollTo({ top: position.windowY });
      } catch {
        document.documentElement.scrollTop = position.windowY;
        document.body.scrollTop = position.windowY;
      }
      lastPageChangePosition.current = null;
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restorePosition);
    });
  }, [items, page]);

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        description="Carteira de clientes com posição de contratos e faturas em aberto."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Clientes encontrados"
          value={formatInteger(totalCustomers)}
          description="Resultado da consulta atual"
          icon={Building2}
          loading={customersQuery.isLoading}
          emphasis="primary"
        />
        <MetricCard
          title="Clientes com atraso"
          value={formatInteger(pageOverdueCustomers)}
          description="Na página carregada"
          icon={AlertTriangle}
          variant={pageOverdueCustomers > 0 ? 'danger' : 'success'}
          loading={customersQuery.isLoading}
        />
        <MetricCard
          title="Faturas em aberto"
          value={formatInteger(pageOpenInvoices)}
          description="Soma dos clientes exibidos"
          icon={FileText}
          loading={customersQuery.isLoading}
        />
        <MetricCard
          title="Total em aberto"
          value={formatCurrencyFromDecimalString(String(pageOutstandingAmount))}
          description="Soma dos clientes exibidos"
          icon={WalletCards}
          variant="warning"
          loading={customersQuery.isLoading}
        />
      </div>

      <SectionCard
        title="Filtros"
        description="Localize rapidamente por dados cadastrais antes de abrir o histórico do cliente."
        contentClassName="flex flex-wrap items-center gap-3"
      >
        <Input
          type="search"
          className="min-w-[240px] flex-1 sm:max-w-sm"
          placeholder="Buscar por nome, documento ou e-mail"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          aria-label="Buscar clientes"
        />
      </SectionCard>

      {customersQuery.isLoading ? <TableSkeleton rows={6} columns={5} /> : null}

      {customersQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar os clientes"
          description="Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!customersQuery.isLoading &&
      !customersQuery.isError &&
      items.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description={
            hasSearch
              ? 'Nenhum cliente corresponde à busca aplicada. Ajuste o termo ou limpe a busca.'
              : 'Aguarde a sincronização com a origem de dados ou atualize a lista.'
          }
          actionLabel={hasSearch ? 'Limpar busca' : 'Atualizar'}
          onAction={
            hasSearch
              ? () => {
                  setSearchInput('');
                  setPage(1);
                }
              : handleRetry
          }
        />
      ) : null}

      {!customersQuery.isLoading &&
      !customersQuery.isError &&
      items.length > 0 ? (
        <div ref={tableShellRef}>
          <TableContainer data-customers-table-scroll>
            <Table className="min-w-[720px]">
              <TableHead>
                <tr>
                  <TableHeaderCell
                    aria-sort={
                      sortBy === 'name'
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="inline-flex items-center font-semibold uppercase tracking-[0.06em]"
                      onClick={() => handleSort('name')}
                    >
                      Cliente
                      <SortIndicator
                        active={sortBy === 'name'}
                        direction={sortDirection}
                      />
                    </button>
                  </TableHeaderCell>
                  <TableHeaderCell>Documento</TableHeaderCell>
                  {NUMERIC_SORTABLE_COLUMNS.map((column) => (
                    <TableHeaderCell
                      key={column.key}
                      align="right"
                      aria-sort={
                        sortBy === column.key
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex items-center font-semibold uppercase tracking-[0.06em]"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        <SortIndicator
                          active={sortBy === column.key}
                          direction={sortDirection}
                        />
                      </button>
                    </TableHeaderCell>
                  ))}
                </tr>
              </TableHead>
              <TableBody>
                {items.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={(event) => {
                      if (!isInteractiveTarget(event.target)) {
                        void navigate(`/clientes/${customer.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      <Link
                        to={`/clientes/${customer.id}`}
                        className="text-primary hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-neutral">
                      {customer.document}
                    </TableCell>
                    <TableCell numeric>
                      {formatInteger(customer.contractsCount)}
                    </TableCell>
                    <TableCell numeric>
                      {formatInteger(customer.openInvoicesCount)}
                    </TableCell>
                    <TableCell numeric>
                      {customer.overdueInvoicesCount > 0 ? (
                        <span className="font-medium text-danger">
                          {formatCurrencyFromDecimalString(
                            customer.overdueAmount,
                          )}
                          <span className="ml-1 text-xs font-normal text-danger/70">
                            ({formatInteger(customer.overdueInvoicesCount)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-neutral/50">—</span>
                      )}
                    </TableCell>
                    <TableCell numeric className="font-medium">
                      {formatCurrencyFromDecimalString(
                        customer.totalOutstanding,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
