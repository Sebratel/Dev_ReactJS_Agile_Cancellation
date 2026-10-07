import { AlertTriangle, LogOut, HelpCircle } from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { useCancellationReasons } from '@/features/dashboard/hooks/use-cancellation-reasons';
import { cn } from '@/lib/utils';
import { formatInteger } from '@/utils/formatters';

const CATEGORY_STYLE: Record<
  string,
  { icon: typeof AlertTriangle; chip: string; bar: string; hint: string }
> = {
  INADIMPLENCIA: {
    icon: AlertTriangle,
    chip: 'bg-danger/10 text-danger',
    bar: 'bg-danger',
    hint: 'Batalha da cobrança — perda potencialmente evitável',
  },
  EXTERNO: {
    icon: LogOut,
    chip: 'bg-warning/10 text-warning',
    bar: 'bg-warning',
    hint: 'Cliente sairia de qualquer jeito — fora do alcance da cobrança',
  },
  OUTRO: {
    icon: HelpCircle,
    chip: 'bg-muted text-neutral',
    bar: 'bg-neutral',
    hint: 'Motivo não informado ou não classificado',
  },
};

export function CancellationReasonsReport() {
  const query = useCancellationReasons();
  const data = query.data;

  return (
    <SectionCard
      title="Encerramentos por motivo"
      description="De tudo que foi encerrado, quanto é inadimplência (foco da cobrança) e quanto é saída externa — vindo dos eventos do ERP (Elleven)."
      contentClassName="p-0"
    >
      {query.isLoading ? (
        <div className="p-4">
          <TableSkeleton rows={5} columns={2} />
        </div>
      ) : !data || data.totalClosed === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-neutral lg:px-6">
          Nenhum caso encerrado para analisar ainda.
        </p>
      ) : (
        <div className="space-y-5 p-4 lg:p-6">
          {/* Cartões por categoria */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.byCategory.map((item) => {
              const style = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.OUTRO;
              const Icon = style.icon;
              return (
                <div
                  key={item.category}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                        style.chip,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-neutral">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                    {formatInteger(item.count)}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', style.bar)}
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-snug text-neutral">
                    {style.hint}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detalhe por motivo */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Motivo (Elleven)</TableHeaderCell>
                  <TableHeaderCell>Categoria</TableHeaderCell>
                  <TableHeaderCell align="right">Encerrados</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.topReasons.map((item) => {
                  const style =
                    CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.OUTRO;
                  return (
                    <TableRow key={`${item.category}-${item.reason}`}>
                      <TableCell className="font-medium">{item.reason}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            style.chip,
                          )}
                        >
                          {CATEGORY_STYLE[item.category]
                            ? item.category === 'INADIMPLENCIA'
                              ? 'Inadimplência'
                              : item.category === 'EXTERNO'
                                ? 'Externo'
                                : 'Outro'
                            : 'Outro'}
                        </span>
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        {formatInteger(item.count)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <p className="text-xs text-neutral">
            Base: {formatInteger(data.totalClosed)} encerrados ·{' '}
            {formatInteger(data.withReason)} com motivo identificado no ERP.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
