import { useRef, useEffect } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { buttonVariants } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import {
  type CollectionCaseListItemResponse,
  type CollectionCasesSortBy,
  type CollectionCasesSortDirection,
} from '@/features/collection-cases/types/collection-cases-api.types';
import { ContactCustomerWhatsAppAction } from '@/features/collection-cases/components/contact-customer-whatsapp-action';
import {
  getCollectionStatusLabel,
  getCollectionStatusVariant,
  getPriorityLabel,
  getPriorityVariant,
  getSlaPresentation,
} from '@/features/collection-cases/utils/collection-case-labels';
import { InlineAssigneeSelect } from '@/features/supervision/components/inline-assignee-select';
import { type UserResponse } from '@/features/users/types/users-api.types';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type SupervisionCasesTableProps = {
  items: CollectionCaseListItemResponse[];
  agents: UserResponse[];
  agentsLoading: boolean;
  workload?: Record<string, number>;
  canDistribute: boolean;
  page: number;
  totalPages: number;
  sortBy: CollectionCasesSortBy | '';
  sortDirection: CollectionCasesSortDirection;
  onPageChange: (page: number) => void;
  onSortChange: (
    sortBy: CollectionCasesSortBy,
    sortDirection: CollectionCasesSortDirection,
  ) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
};

type SortableColumn = {
  key: CollectionCasesSortBy;
  label: string;
  numeric?: boolean;
};

const SORTABLE_COLUMNS: SortableColumn[] = [
  { key: 'daysOverdue', label: 'Dias em atraso', numeric: true },
  { key: 'totalOutstanding', label: 'Valor em aberto', numeric: true },
  { key: 'slaDueAt', label: 'SLA' },
];

const CRITICAL_STATUSES = new Set(['NO_RESPONSE', 'ELIGIBLE_FOR_CANCELLATION']);

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: CollectionCasesSortDirection;
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

function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
      aria-label="Selecionar todos"
    />
  );
}

export function SupervisionCasesTable({
  items,
  agents,
  agentsLoading,
  workload,
  canDistribute,
  page,
  totalPages,
  sortBy,
  sortDirection,
  onPageChange,
  onSortChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: SupervisionCasesTableProps) {
  const handleSort = (column: CollectionCasesSortBy) => {
    if (sortBy === column) {
      onSortChange(column, sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    onSortChange(column, 'desc');
  };

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = items.some((i) => selectedIds.has(i.id));

  return (
    <SectionCard
      title="Casos de cobrança"
      description="Carteira supervisionada com leitura operacional por cliente, contrato e SLA."
      contentClassName="p-0"
    >
      <TableContainer flush className="max-h-[70vh] overflow-y-auto">
        <Table className="min-w-[960px]">
          <TableHead sticky>
            <tr>
              {canDistribute ? (
                <th scope="col" className="w-10 px-3 py-1.5">
                  <SelectAllCheckbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={onToggleSelectAll}
                  />
                </th>
              ) : null}
              <TableHeaderCell>Cliente</TableHeaderCell>
              <TableHeaderCell>Contrato</TableHeaderCell>
              {SORTABLE_COLUMNS.map((column) => (
                <TableHeaderCell
                  key={column.key}
                  align="center"
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
                    className="inline-flex items-center justify-center font-semibold uppercase tracking-[0.12em]"
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
              <TableHeaderCell>Responsável</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell align="center">Prioridade</TableHeaderCell>
              <TableHeaderCell>Ação</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const sla = getSlaPresentation(item.slaDueAt);
              const isSelected = selectedIds.has(item.id);
              const isCritical =
                CRITICAL_STATUSES.has(item.status) ||
                item.priority === 'CRITICAL' ||
                sla.variant === 'danger';

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    isCritical &&
                      'border-l-2 border-l-danger bg-danger/[0.025] hover:bg-danger/[0.045]',
                    isSelected && 'bg-primary/5',
                  )}
                >
                  {canDistribute ? (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                        aria-label={`Selecionar caso de ${item.customerName}`}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate">
                        {item.customerName}
                      </span>
                      <ContactCustomerWhatsAppAction
                        caseId={item.id}
                        customerName={item.customerName}
                        customerPhone={item.customerPhone}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral">
                    {item.contractCode}
                  </TableCell>
                  <TableCell align="center" className="tabular-nums">
                    {formatInteger(item.daysOverdue)}
                  </TableCell>
                  <TableCell align="center" className="font-medium tabular-nums">
                    {formatCurrencyFromDecimalString(item.outstandingAmount)}
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center">
                      <StatusBadge label={sla.label} variant={sla.variant} />
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral">
                    {canDistribute ? (
                      <InlineAssigneeSelect
                        caseId={item.id}
                        currentAssignee={item.assignedTo}
                        agents={agents}
                        agentsLoading={agentsLoading}
                        workload={workload}
                      />
                    ) : (
                      item.assignedTo?.name ?? 'Não atribuído'
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={getCollectionStatusLabel(item.status)}
                      variant={getCollectionStatusVariant(item.status)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center">
                      <StatusBadge
                        label={getPriorityLabel(item.priority)}
                        variant={getPriorityVariant(item.priority)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/supervisao/${item.id}`}
                      className={cn(
                        buttonVariants({ variant: 'secondary', size: 'sm' }),
                      )}
                    >
                      Ver detalhes
                    </Link>
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
        onPageChange={onPageChange}
        className="border-t border-border px-4 py-4 lg:px-6"
      />
    </SectionCard>
  );
}
