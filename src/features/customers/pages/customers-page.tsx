import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '@/components/data-display/page-header';
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

  const items = customersQuery.data?.items ?? [];
  const totalPages = Math.max(
    customersQuery.data?.pagination.totalPages ?? 1,
    1,
  );
  const hasSearch = debouncedSearch.trim().length > 0;

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

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        description="Carteira de clientes com posição de contratos e faturas em aberto."
      />

      <div className="flex flex-wrap items-center gap-3">
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
      </div>

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
        <>
          <TableContainer>
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
                  <TableRow key={customer.id}>
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
                          {formatCurrencyFromDecimalString(customer.overdueAmount)}
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
            onPageChange={setPage}
          />
        </>
      ) : null}
    </PageContainer>
  );
}
