import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import type {
  CollectionCaseListItemResponse,
  CollectionCasesListParams,
} from '@/features/collection-cases/types/collection-cases-api.types';
import { formatCurrencyBRL, formatDateOnlyPtBR } from '@/utils/formatters';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 15;

type Props = {
  filters: CollectionCasesListParams;
  totalCount: number;
};

export function BulkContactPreviewDialog({ filters, totalCount }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const query = useCollectionCases(
    { ...filters, page, limit: PAGE_SIZE },
    { enabled: open },
  );

  const cases = query.data?.items ?? [];
  const total = query.data?.pagination.total ?? totalCount;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setPage(1);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm" disabled={totalCount === 0}>
          Ver clientes ({totalCount})
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-foreground">
                Clientes selecionados
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-neutral">
                {total} cliente{total !== 1 ? 's' : ''} corresponde{total === 1 ? '' : 'm'} aos filtros aplicados.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" className="p-1.5" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Table */}
          <div className="min-h-0 flex-1 overflow-auto">
            {query.isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-neutral">
                Carregando...
              </div>
            ) : cases.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-neutral">
                Nenhum cliente encontrado.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-neutral">
                  <tr>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Contrato</th>
                    <th className="px-4 py-3 text-right">Dias em atraso</th>
                    <th className="px-4 py-3 text-right">Em aberto</th>
                    <th className="px-4 py-3 text-left">1o vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cases.map((c: CollectionCaseListItemResponse) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{c.customerName}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral">{c.contractCode}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral">
                        {c.daysOverdue}d
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                        {formatCurrencyBRL(Number(c.outstandingAmount))}
                      </td>
                      <td className="px-4 py-3 text-neutral">
                        {c.firstOverdueDate ? formatDateOnlyPtBR(c.firstOverdueDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer / pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <p className="text-xs text-neutral">
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="p-1.5"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="p-1.5"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
