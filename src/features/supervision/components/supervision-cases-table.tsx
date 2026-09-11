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
import { useContainerWidth } from '@/hooks/use-container-width';
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
  formatDateOnlyPtBR,
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

function AndamentoBadges({
  item,
  className,
}: {
  item: CollectionCaseListItemResponse;
  className?: string;
}) {
  const matrixReply = getMatrixReplyPresentation(item);
  return (
    <div className={className}>
      <StatusBadge
        label={getCollectionStatusLabel(item.status)}
        variant={getCollectionStatusVariant(item.status)}
      />
      <StatusBadge label={matrixReply.label} variant={matrixReply.variant} />
      <StatusBadge
        label={getPriorityLabel(item.priority)}
        variant={getPriorityVariant(item.priority)}
      />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral">
      {children}
    </div>
  );
}

// Layout de cada caso em cartao — usado em telas menores, onde a tabela nao cabe.
function SupervisionCaseCards({
  items,
  agents,
  agentsLoading,
  workload,
  canDistribute,
  selectedIds,
  onToggleSelect,
}: Pick<
  SupervisionCasesTableProps,
  | 'items'
  | 'agents'
  | 'agentsLoading'
  | 'workload'
  | 'canDistribute'
  | 'selectedIds'
  | 'onToggleSelect'
>) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => {
        const sla = getSlaPresentation(item.slaDueAt);
        const isSelected = selectedIds.has(item.id);
        const isCritical =
          CRITICAL_STATUSES.has(item.status) ||
          item.priority === 'CRITICAL' ||
          sla.variant === 'danger';

        return (
          <article
            key={item.id}
            className={cn(
              'p-4',
              isCritical && 'border-l-2 border-l-danger bg-danger/[0.025]',
              isSelected && 'bg-primary/5',
            )}
          >
            <div className="flex items-start gap-2">
              {canDistribute ? (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(item.id)}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary"
                  aria-label={`Selecionar caso de ${item.customerName}`}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate font-medium">
                    {item.customerName}
                  </span>
                  <ContactCustomerWhatsAppAction
                    caseId={item.id}
                    customerName={item.customerName}
                    customerPhone={item.customerPhone}
                  />
                </div>
                <div className="text-xs text-neutral">{item.contractCode}</div>
              </div>
              <Link
                to={`/supervisao/${item.id}`}
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'sm' }),
                  'shrink-0',
                )}
              >
                Ver detalhes
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <FieldLabel>Vencimentos</FieldLabel>
                <div className="text-xs">
                  1º{' '}
                  <span className="tabular-nums">
                    {formatDateOnlyPtBR(item.firstOverdueDate) ?? '—'}
                  </span>
                </div>
                <div className="text-xs">
                  2º{' '}
                  <span className="tabular-nums">
                    {formatDateOnlyPtBR(item.secondOverdueDate) ?? '—'}
                  </span>
                </div>
                <div className="pt-1">
                  <StatusBadge
                    label={getContractStatusLabel(item.contractStatus)}
                    variant={getContractStatusVariant(item.contractStatus)}
                  />
                </div>
              </div>
              <div className="space-y-0.5">
                <FieldLabel>Financeiro</FieldLabel>
                <div className="font-semibold tabular-nums">
                  {formatCurrencyFromDecimalString(item.outstandingAmount)}
                </div>
                <div className="text-xs text-neutral">
                  {formatInteger(item.daysOverdue)} dias em atraso
                </div>
                <div className="pt-1">
                  <StatusBadge label={sla.label} variant={sla.variant} />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <FieldLabel>Responsável</FieldLabel>
                <div className="mt-0.5">
                  {canDistribute ? (
                    <InlineAssigneeSelect
                      caseId={item.id}
                      currentAssignee={item.assignedTo}
                      agents={agents}
                      agentsLoading={agentsLoading}
                      workload={workload}
                    />
                  ) : (
                    <span className="text-sm text-neutral">
                      {item.assignedTo?.name ?? 'Não atribuído'}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <FieldLabel>Tentativas</FieldLabel>
                <div className="text-sm font-semibold tabular-nums">
                  {formatInteger(item.totalAttempts)}
                </div>
              </div>
            </div>

            <AndamentoBadges item={item} className="mt-3 flex flex-wrap gap-1.5" />
          </article>
        );
      })}
    </div>
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
  // Alterna tabela x cards pela largura REAL disponível (container), não pelo
  // viewport — a sidebar consome largura e deixava a tabela apertada em
  // notebooks. Abaixo de 1280px de espaço útil (notebooks ~1100px depois da
  // sidebar), usa cards; só telas realmente largas mostram a tabela. 0 = ainda
  // não medido (jsdom/1º render) → mantém a tabela para não quebrar os testes.
  const shellWidth = useContainerWidth(tableShellRef);
  const isNarrow = shellWidth > 0 && shellWidth < 1280;

  return (
    <SectionCard
      title="Casos de cobrança"
      description="Carteira supervisionada com leitura operacional por cliente, contrato e SLA."
      contentClassName="p-0"
    >
      <div ref={tableShellRef}>
      {isNarrow ? (
        <SupervisionCaseCards
          items={items}
          agents={agents}
          agentsLoading={agentsLoading}
          workload={workload}
          canDistribute={canDistribute}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      ) : (
      <TableContainer
        flush
        className="max-h-[70vh] overflow-y-auto"
        data-supervision-table-scroll
      >
        <Table className="min-w-[980px] table-fixed">
          <colgroup>
            {canDistribute ? <col className="w-10" /> : null}
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
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
              <TableHeaderCell align="center">Tentativas</TableHeaderCell>
              <TableHeaderCell>Responsável</TableHeaderCell>
              <TableHeaderCell align="center">Andamento</TableHeaderCell>
              <TableHeaderCell align="center">Ação</TableHeaderCell>
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
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {item.contractCode}
                      </div>
                      <div className="text-xs">
                        1º venc.{' '}
                        <span className="tabular-nums">
                          {formatDateOnlyPtBR(item.firstOverdueDate) ??
                            'Não informado'}
                        </span>
                      </div>
                      <div className="text-xs">
                        2º venc.{' '}
                        <span className="tabular-nums">
                          {formatDateOnlyPtBR(item.secondOverdueDate) ??
                            'Não informado'}
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
                  <TableCell align="center">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatInteger(item.totalAttempts)}
                    </span>
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
                    <AndamentoBadges
                      item={item}
                      className="flex flex-col items-center gap-1"
                    />
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
      )}
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
