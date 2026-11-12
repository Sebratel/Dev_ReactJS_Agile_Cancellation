import { useRef, useEffect } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
import {
  getCollectionStatusLabel,
  getPriorityLabel,
  getPriorityVariant,
  isCreditLockedStatus,
} from '@/features/collection-cases/utils/collection-case-labels';
import { getContractStatusLabel } from '@/features/customers/utils/customer-labels';
import {
  SEVERITY_ROW_CLASS,
  SEVERITY_TEXT_CLASS,
  getOverdueSeverity,
  getVisibleSla,
  isInteractiveTarget,
} from '@/features/collection-cases/utils/case-row-presentation';
import { HsmDeliveryBadge } from '@/features/collection-cases/components/hsm-delivery-badge';
import { InlineAssigneeSelect } from '@/features/supervision/components/inline-assignee-select';
import { type UserResponse } from '@/features/users/types/users-api.types';
import {
  formatDatePtBR,
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type CancellationsTableProps = {
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
};

const PRIORITY_DOT_CLASS: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral/60',
};

const SORTABLE_COLUMNS: SortableColumn[] = [
  { key: 'daysOverdue', label: 'Atraso' },
  { key: 'totalOutstanding', label: 'Valor' },
  { key: 'slaDueAt', label: 'SLA' },
];

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

export function CancellationsTable({
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
}: CancellationsTableProps) {
  const navigate = useNavigate();
  const handleSort = (column: CollectionCasesSortBy) => {
    if (sortBy === column) {
      onSortChange(column, sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    onSortChange(column, 'desc');
  };

  const allSelected =
    items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = items.some((i) => selectedIds.has(i.id));

  return (
    <SectionCard
      title="Processos de cancelamento"
      description="Casos em esteira de cancelamento com atribuição e acompanhamento de andamento."
      contentClassName="p-0"
    >
      <TableContainer flush className="max-h-[70vh] overflow-y-auto">
        <Table className="table-fixed">
          <colgroup>
            {canDistribute ? <col className="w-10" /> : null}
            <col className="w-[24%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-14" />
          </colgroup>
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
              {SORTABLE_COLUMNS.map((column) => (
                <TableHeaderCell
                  key={column.key}
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
                    className="inline-flex items-center font-semibold uppercase tracking-[0.12em]"
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
              <TableHeaderCell>Situação</TableHeaderCell>
              <TableHeaderCell>Responsável</TableHeaderCell>
              <TableHeaderCell align="center">
                <span className="sr-only">Ações</span>
              </TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const sla = getVisibleSla(item.slaDueAt);
              const isSelected = selectedIds.has(item.id);
              const severity = getOverdueSeverity(
                item.daysOverdue,
                item.priority === 'CRITICAL' || sla?.variant === 'danger',
              );
              const detailPath = `/cancelamentos/${item.id}`;

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    'cursor-pointer',
                    SEVERITY_ROW_CLASS[severity],
                    isSelected && 'bg-primary/5',
                  )}
                  onClick={(event) => {
                    if (!isInteractiveTarget(event.target)) {
                      void navigate(detailPath);
                    }
                  }}
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
                    <div className="truncate">{item.customerName}</div>
                    <div className="mt-0.5 text-xs font-normal text-neutral">
                      Contrato {item.contractCode}
                      {item.firstOverdueDate
                        ? ` · venc. ${formatDatePtBR(item.firstOverdueDate)}`
                        : ''}
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'font-semibold tabular-nums',
                      SEVERITY_TEXT_CLASS[severity],
                    )}
                  >
                    {formatInteger(item.daysOverdue)} dias
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatCurrencyFromDecimalString(item.outstandingAmount)}
                  </TableCell>
                  <TableCell>
                    {sla ? (
                      <StatusBadge label={sla.label} variant={sla.variant} />
                    ) : (
                      <span className="text-neutral">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-block h-2 w-2 shrink-0 rounded-full',
                            PRIORITY_DOT_CLASS[
                              getPriorityVariant(item.priority)
                            ] ?? 'bg-neutral/60',
                          )}
                          title={`Prioridade: ${getPriorityLabel(item.priority)}`}
                          aria-label={`Prioridade ${getPriorityLabel(item.priority)}`}
                        />
                        <span className="font-medium text-foreground">
                          {getCollectionStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="text-xs text-neutral">
                        Contrato {getContractStatusLabel(item.contractStatus)}
                        <HsmDeliveryBadge
                          inline
                          state={item.hsmDeliveryState}
                          detail={item.hsmDeliveryDetail}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral">
                    {canDistribute && !isCreditLockedStatus(item.status) ? (
                      <InlineAssigneeSelect
                        caseId={item.id}
                        currentAssignee={item.assignedTo}
                        agents={agents}
                        agentsLoading={agentsLoading}
                        workload={workload}
                      />
                    ) : (
                      (item.assignedTo?.name ?? 'Não atribuído')
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Link
                      to={detailPath}
                      title="Ver processo"
                      aria-label={`Ver processo de ${item.customerName}`}
                      className={buttonVariants({
                        variant: 'ghost',
                        size: 'sm',
                      })}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
