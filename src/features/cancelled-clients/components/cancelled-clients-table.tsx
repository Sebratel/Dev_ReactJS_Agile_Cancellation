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
import { type CollectionCaseListItemResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { canReopenCancelled } from '@/features/cancelled-clients/utils/can-reopen-cancelled';
import { isInteractiveTarget } from '@/features/collection-cases/utils/case-row-presentation';
import {
  getCollectionStatusLabel,
  getCollectionStatusVariant,
} from '@/features/collection-cases/utils/collection-case-labels';
import {
  formatCurrencyFromDecimalString,
  formatDatePtBR,
  formatInteger,
} from '@/utils/formatters';

type CancelledClientsTableProps = {
  items: CollectionCaseListItemResponse[];
  selectable: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function CancelledClientsTable({
  items,
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  page,
  totalPages,
  onPageChange,
}: CancelledClientsTableProps) {
  const navigate = useNavigate();
  const selectableItems = items.filter(canReopenCancelled);
  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selectedIds.has(item.id));

  return (
    <SectionCard
      title="Clientes cancelados"
      description="Todos os cancelados que passaram pela plataforma, de carteira ou diretos. Só viram recuperados quando o ERP mostrar o contrato ativo de novo."
      contentClassName="p-0"
    >
      <TableContainer flush className="max-h-[70vh] overflow-y-auto">
        <Table className="table-fixed">
          <colgroup>
            {selectable ? <col className="w-10" /> : null}
            <col className="w-[25%]" />
            <col className="w-[13%]" />
            <col className="w-[19%]" />
            <col className="w-[17%]" />
            <col className="w-[18%]" />
            <col className="w-14" />
          </colgroup>
          <TableHead sticky>
            <tr>
              {selectable ? (
                <th scope="col" className="w-10 px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={selectableItems.length === 0}
                    onChange={onToggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-border accent-primary disabled:cursor-not-allowed"
                    aria-label="Selecionar todos os que podem voltar à carteira"
                  />
                </th>
              ) : null}
              <TableHeaderCell>Cliente</TableHeaderCell>
              <TableHeaderCell>Em aberto</TableHeaderCell>
              <TableHeaderCell>Motivo</TableHeaderCell>
              <TableHeaderCell>Responsável</TableHeaderCell>
              <TableHeaderCell>Situação</TableHeaderCell>
              <TableHeaderCell align="center">
                <span className="sr-only">Ações</span>
              </TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const detailPath = `/cancelados/${item.id}`;
              const isSelected = selectedIds.has(item.id);
              const reopenable = canReopenCancelled(item);

              return (
                <TableRow
                  key={item.id}
                  className={cn('cursor-pointer', isSelected && 'bg-primary/5')}
                  onClick={(event) => {
                    if (!isInteractiveTarget(event.target)) {
                      void navigate(detailPath);
                    }
                  }}
                >
                  {selectable ? (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!reopenable}
                        onChange={() => onToggleSelect(item.id)}
                        title={
                          reopenable
                            ? undefined
                            : 'Já está em uma carteira ou foi reativado'
                        }
                        className="h-4 w-4 cursor-pointer rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Selecionar ${item.customerName}`}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    <div className="truncate">{item.customerName}</div>
                    <div className="mt-0.5 text-xs font-normal text-neutral">
                      Contrato {item.contractCode}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium tabular-nums">
                      {formatCurrencyFromDecimalString(item.outstandingAmount)}
                    </div>
                    <div className="text-xs tabular-nums text-neutral">
                      {formatInteger(item.daysOverdue)} dias
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-sm text-neutral"
                    title={item.contractCancellationReason ?? undefined}
                  >
                    <span className="line-clamp-2">
                      {item.contractCancellationReason ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-neutral">
                    <div>{item.assignedTo?.name ?? 'Não atribuído'}</div>
                    {item.assignedAt ? (
                      <div className="text-xs">
                        desde {formatDatePtBR(item.assignedAt)}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={getCollectionStatusLabel(item.status)}
                      variant={getCollectionStatusVariant(item.status)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Link
                      to={detailPath}
                      title="Ver cliente cancelado"
                      aria-label={`Ver ${item.customerName}`}
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
