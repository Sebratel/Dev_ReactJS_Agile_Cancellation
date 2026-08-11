import * as Dialog from '@radix-ui/react-dialog';
import { Copy, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/lib/toast';
import { SectionCard } from '@/components/data-display/section-card';
import { Button } from '@/components/ui/button';
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
import { type AuditLogItem } from '@/features/auditoria/types/auditoria-api.types';
import { cn } from '@/lib/utils';
import { formatDateTimePtBR } from '@/utils/formatters';

type AuditoriaLogsTableProps = {
  items: AuditLogItem[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function isCriticalAction(action: string) {
  return action === 'DELETE' || action === 'STATUS_CHANGE';
}

function AuditoriaLogDetailDialog({
  log,
  open,
  onOpenChange,
}: {
  log: AuditLogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                Detalhes da auditoria
              </Dialog.Title>
              <Dialog.Description className="text-sm text-neutral">
                {log.summary}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 px-0"
                aria-label="Fechar detalhes"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                Data/hora
              </dt>
              <dd>{formatDateTimePtBR(log.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                Usuário
              </dt>
              <dd>
                {log.actor
                  ? `${log.actor.name} (${log.actor.email})`
                  : 'Sistema'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                Ação
              </dt>
              <dd>{log.action}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                Entidade
              </dt>
              <dd>
                {log.entityType} · {log.entityId}
              </dd>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Metadados
                </dt>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(JSON.stringify(log.metadata, null, 2))
                      .then(() => {
                        toast.success('Metadados copiados.');
                      })
                      .catch(() => {
                        toast.error('Não foi possível copiar os metadados.');
                      });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiar
                </Button>
              </div>
              <dd className="mt-1">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/60 p-3 text-xs leading-5 text-foreground">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </dd>
            </div>
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AuditoriaLogsTable({
  items,
  page,
  totalPages,
  onPageChange,
}: AuditoriaLogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  return (
    <>
      <SectionCard
        title="Registros de auditoria"
        description="Histórico de ações executadas na plataforma."
        contentClassName="p-0"
      >
        <TableContainer flush className="max-h-[70vh] overflow-y-auto">
          <Table className="min-w-[960px]">
            <TableHead sticky>
              <tr>
                {[
                  'Data/hora',
                  'Usuário',
                  'Ação',
                  'Entidade',
                  'Resumo',
                  'Detalhes',
                ].map((header) => (
                  <TableHeaderCell key={header} className="lg:px-4">
                    {header}
                  </TableHeaderCell>
                ))}
              </tr>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-neutral lg:px-4">
                    {formatDateTimePtBR(item.createdAt)}
                  </TableCell>
                  <TableCell className="lg:px-4">
                    <div className="font-medium text-foreground">
                      {item.actor?.name ?? 'Sistema'}
                    </div>
                    {item.actor?.email ? (
                      <div className="text-xs text-neutral">
                        {item.actor.email}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="lg:px-4">
                    <span
                      className={cn(
                        'font-medium',
                        isCriticalAction(item.action)
                          ? 'text-danger'
                          : 'text-foreground',
                      )}
                    >
                      {item.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-neutral lg:px-4">
                    <div>{item.entityType}</div>
                    <div className="text-xs">{item.entityId}</div>
                  </TableCell>
                  <TableCell className="text-foreground lg:px-4">
                    {item.summary}
                  </TableCell>
                  <TableCell className="lg:px-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Ver detalhes de ${item.summary}`}
                      onClick={() => setSelectedLog(item)}
                    >
                      Ver detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          className="border-t border-border px-4 py-3"
        />
      </SectionCard>

      {selectedLog ? (
        <AuditoriaLogDetailDialog
          log={selectedLog}
          open={Boolean(selectedLog)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedLog(null);
            }
          }}
        />
      ) : null}
    </>
  );
}
