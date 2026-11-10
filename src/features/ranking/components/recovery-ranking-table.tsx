import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionCard } from '@/components/data-display/section-card';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { type RankingRow } from '@/features/ranking/utils/ranking-stats';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  formatCurrencyBRL,
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type RecoveryRankingTableProps = {
  rows: RankingRow[];
  // Quando informado, cada linha ganha o botão "Ver conferência".
  onOpenAudit?: (agent: { userId: string; name: string }) => void;
};

export function RecoveryRankingTable({
  rows,
  onOpenAudit,
}: RecoveryRankingTableProps) {
  return (
    <SectionCard
      title="Ranking completo"
      description="Todos os colaboradores com recuperações no período selecionado."
      contentClassName="p-0"
    >
      <TableContainer flush>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-14">#</TableHeaderCell>
              <TableHeaderCell>Colaborador</TableHeaderCell>
              <TableHeaderCell align="right">Casos</TableHeaderCell>
              <TableHeaderCell align="right">Receita</TableHeaderCell>
              <TableHeaderCell align="right" className="hidden md:table-cell">
                Ticket médio
              </TableHeaderCell>
              <TableHeaderCell className="hidden w-56 lg:table-cell">
                Participação
              </TableHeaderCell>
              {onOpenAudit ? (
                <TableHeaderCell align="right">Conferência</TableHeaderCell>
              ) : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.userId}>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                      row.rank === 1
                        ? 'bg-primary text-foreground'
                        : 'bg-muted text-neutral',
                    )}
                  >
                    {row.rank}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={row.name}
                      avatarUrl={row.avatarUrl}
                      className="h-8 w-8 text-xs"
                    />
                    <span className="font-medium">{row.name}</span>
                  </div>
                </TableCell>
                <TableCell numeric>
                  {formatInteger(row.recoveredCases)}
                </TableCell>
                <TableCell numeric className="font-semibold">
                  {formatCurrencyFromDecimalString(row.recoveredAmount)}
                </TableCell>
                <TableCell
                  numeric
                  className="hidden text-neutral md:table-cell"
                >
                  {formatCurrencyBRL(row.averageTicket)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full origin-left rounded-full bg-primary motion-safe:animate-grow-x"
                        style={{ width: `${Math.max(row.sharePercent, 2)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-neutral">
                      {Math.round(row.sharePercent)}%
                    </span>
                  </div>
                </TableCell>
                {onOpenAudit ? (
                  <TableCell numeric>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAudit({ userId: row.userId, name: row.name });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                      aria-label={`Ver conferência de ${row.name}`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Ver conferência
                    </button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );
}
