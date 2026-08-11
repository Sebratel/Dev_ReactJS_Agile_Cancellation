import { Link } from 'react-router-dom';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { buttonVariants } from '@/components/ui/button';
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
import { formatCurrencyBRL, formatInteger } from '@/utils/formatters';
import { type CriticalCase } from '@/features/dashboard/types/dashboard.types';

type CriticalCasesTableProps = {
  cases: CriticalCase[];
};

export function CriticalCasesTable({ cases }: CriticalCasesTableProps) {
  return (
    <SectionCard
      title="Casos críticos"
      description="Contratos com atraso elevado, pressão de SLA ou risco de cancelamento."
      contentClassName="p-0"
    >
      <div className="flex items-center justify-end border-b border-border px-6 py-3">
        <Link
          to="/supervisao?sortBy=daysOverdue&sortDirection=desc"
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          Ver todos na supervisão
        </Link>
      </div>
      <TableContainer flush>
        <Table className="min-w-[960px]">
          <TableHead>
            <tr>
              <TableHeaderCell>Cliente</TableHeaderCell>
              <TableHeaderCell>Contrato</TableHeaderCell>
              <TableHeaderCell align="right">Dias em atraso</TableHeaderCell>
              <TableHeaderCell align="right">Valor em aberto</TableHeaderCell>
              <TableHeaderCell>Responsável</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Prioridade</TableHeaderCell>
              <TableHeaderCell>SLA</TableHeaderCell>
              <TableHeaderCell>Ação</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {cases.map((criticalCase) => (
              <TableRow key={criticalCase.id}>
                <TableCell className="font-medium">
                  {criticalCase.customer}
                </TableCell>
                <TableCell className="text-neutral">
                  {criticalCase.contract}
                </TableCell>
                <TableCell numeric>
                  {formatInteger(criticalCase.daysOverdue)}
                </TableCell>
                <TableCell numeric className="font-medium">
                  {formatCurrencyBRL(criticalCase.outstandingAmount)}
                </TableCell>
                <TableCell className="text-neutral">
                  {criticalCase.owner}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={criticalCase.statusLabel}
                    variant={criticalCase.statusVariant}
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={criticalCase.priorityLabel}
                    variant={criticalCase.priorityVariant}
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={criticalCase.slaLabel}
                    variant={criticalCase.slaVariant}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to={`/supervisao/${criticalCase.id}`}
                    className={cn(
                      buttonVariants({ variant: 'secondary', size: 'sm' }),
                    )}
                  >
                    Ver detalhes
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );
}
