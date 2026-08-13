import { useRef, useEffect, useLayoutEffect } from 'react';
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
import {
  getContractStatusLabel,
  getContractStatusVariant,
} from '@/features/customers/utils/customer-labels';
import { InlineAssigneeSelect } from '@/features/supervision/components/inline-assignee-select';
import { type UserResponse } from '@/features/users/types/users-api.types';
import {
  formatDatePtBR,
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

const CRITICAL_STATUSES = new Set(['NO_RESPONSE', 'ELIGIBLE_FOR_CANCELLATION']);

function getMatrixReplyPresentation(item: CollectionCaseListItemResponse) {
  if (item.matrixAwaitingReply) {
    return {
      label: 'Aguardando resposta',
      variant: 'warning' as const,
    };
  }

  if (item.matrixLastReplyAt) {
    return {
      label: 'Respondido',
      variant: 'success' as const,
    };
  }

  return {
    label: 'Não acionado',
    variant: 'neutral' as const,
  };
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
  const tableShellRef = useRef<HTMLDivElement>(null);
  const lastPageChangePosition = useRef<{
    windowY: number;
    tableY: number;
  } | null>(null);

  const handlePageChange = (nextPage: number) => {
    const tableContainer = tableShellRef.current?.querySelector<HTMLDivElement>(
      '[data-supervision-table-scroll]',
    );
    lastPageChangePosition.current = {
      windowY: window.scrollY,
      tableY: tableContainer?.scrollTop ?? 0,
    };
    onPageChange(nextPage);
  };

  const handleDaysOverdueSort = () => {
    onSortChange(
      'daysOverdue',
      sortBy === 'daysOverdue' && sortDirection === 'desc' ? 'asc' : 'desc',
    );
  };

  useLayoutEffect(() => {
    const position = lastPageChangePosition.current;
    if (!position) return;

    const restorePosition = () => {
      const tableContainer = tableShellRef.current?.querySelector<HTMLDivElement>(
        '[data-supervision-table-scroll]',
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

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = items.some((i) => selectedIds.has(i.id));

  return (
    <SectionCard
      title="Casos de cobrança"
      description="Carteira supervisionada com leitura operacional por cliente, contrato e SLA."
      contentClassName="p-0"
    >
      <div ref={tableShellRef}>
      <TableContainer
        flush
        className="max-h-[70vh] overflow-y-auto"
        data-supervision-table-scroll
      >
        <Table className="min-w-[980px] table-fixed">
          <colgroup>
            {canDistribute ? <col className="w-10" /> : null}
            <col className="w-[23%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[18%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
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
              <TableHeaderCell>Contrato</TableHeaderCell>
              <TableHeaderCell align="center">
                <button
                  type="button"
                  onClick={handleDaysOverdueSort}
                  className="inline-flex items-center justify-center gap-1 rounded px-1 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`Dias em atraso ${
                    sortBy === 'daysOverdue'
                      ? sortDirection === 'desc'
                        ? 'ordenado decrescente'
                        : 'ordenado crescente'
                      : 'sem ordenação'
                  }`}
                >
                  Financeiro
                  <span aria-hidden="true">
                    {sortBy === 'daysOverdue'
                      ? sortDirection === 'desc'
                        ? '↓'
                        : '↑'
                      : '↕'}
                  </span>
                </button>
              </TableHeaderCell>
              <TableHeaderCell>Responsável</TableHeaderCell>
              <TableHeaderCell align="center">Andamento</TableHeaderCell>
              <TableHeaderCell align="center">Ação</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const sla = getSlaPresentation(item.slaDueAt);
              const matrixReply = getMatrixReplyPresentation(item);
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
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {item.contractCode}
                      </div>
                      <div className="text-xs">
                        Venc.{' '}
                        <span className="tabular-nums">
                          {item.firstOverdueDate
                            ? formatDatePtBR(item.firstOverdueDate)
                            : 'Não informado'}
                        </span>
                      </div>
                      <StatusBadge
                        label={getContractStatusLabel(item.contractStatus)}
                        variant={getContractStatusVariant(item.contractStatus)}
                      />
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <div className="space-y-1">
                      <div className="font-semibold tabular-nums">
                        {formatCurrencyFromDecimalString(item.outstandingAmount)}
                      </div>
                      <div className="text-xs text-neutral">
                        {formatInteger(item.daysOverdue)} dias em atraso
                      </div>
                      <div className="flex justify-center">
                        <StatusBadge label={sla.label} variant={sla.variant} />
                      </div>
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
                  <TableCell align="center">
                    <div className="flex flex-col items-center gap-1">
                      <StatusBadge
                        label={getCollectionStatusLabel(item.status)}
                        variant={getCollectionStatusVariant(item.status)}
                      />
                      <StatusBadge
                        label={matrixReply.label}
                        variant={matrixReply.variant}
                      />
                      <StatusBadge
                        label={getPriorityLabel(item.priority)}
                        variant={getPriorityVariant(item.priority)}
                      />
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <Link
                      to={`/supervisao/${item.id}`}
                      className={cn(
                        buttonVariants({ variant: 'secondary', size: 'sm' }),
                        'justify-center',
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
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        className="border-t border-border px-4 py-4 lg:px-6"
      />
    </SectionCard>
  );
}
