import * as Dialog from '@radix-ui/react-dialog';
import { Copy, RefreshCw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { UserAvatar } from '@/components/ui/user-avatar';
import { type AuditLogItem } from '@/features/auditoria/types/auditoria-api.types';
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_CATEGORY_VARIANTS,
  formatAuditTime,
  getAuditCategory,
  groupAuditLogsByDay,
} from '@/features/auditoria/utils/auditoria-presentation';
import { formatDateTimePtBR } from '@/utils/formatters';

type AuditoriaTimelineProps = {
  items: AuditLogItem[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const STANDALONE_CATEGORIES = new Set(['ACCESS', 'EXPORT']);

function ActorAvatar({ item }: { item: AuditLogItem }) {
  if (!item.actor) {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-neutral"
        title="Ação automática do sistema"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <UserAvatar
      name={item.actor.name}
      avatarUrl={item.actor.avatarUrl}
      className="h-8 w-8 text-xs"
    />
  );
}

// "Débora registrou uma tentativa de contato com ACME LTDA": quem, o quê e em
// quem. Sem cliente identificado, cai no resumo técnico traduzido.
function AuditSentence({ item }: { item: AuditLogItem }) {
  const actorName = item.actor?.name ?? 'Sistema';
  const category = getAuditCategory(item);

  if (item.verb && item.subject) {
    return (
      <>
        <strong className="font-semibold">{actorName}</strong> {item.verb}{' '}
        <strong className="font-semibold">{item.subject.customerName}</strong>
      </>
    );
  }

  if (item.verb && STANDALONE_CATEGORIES.has(category)) {
    return (
      <>
        <strong className="font-semibold">{actorName}</strong> {item.verb}
      </>
    );
  }

  return (
    <>
      <strong className="font-semibold">{actorName}</strong>: {item.summary}
    </>
  );
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
            {log.subject ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Cliente
                </dt>
                <dd>
                  {log.subject.customerName}
                  {log.subject.contractCode
                    ? ` · Contrato ${log.subject.contractCode}`
                    : ''}
                </dd>
              </div>
            ) : null}
            {log.detail ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Detalhe
                </dt>
                <dd>{log.detail}</dd>
              </div>
            ) : null}
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

export function AuditoriaTimeline({
  items,
  page,
  totalPages,
  onPageChange,
}: AuditoriaTimelineProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const groups = useMemo(() => groupAuditLogsByDay(items), [items]);

  return (
    <>
      <SectionCard
        title="Registros de auditoria"
        description="Quem fez o quê, em qual cliente e quando."
        contentClassName="p-0"
      >
        <div>
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className="border-t border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-neutral first:border-t-0 lg:px-6">
                {group.label}
              </h3>
              <ul>
                {group.items.map((item) => {
                  const category = getAuditCategory(item);

                  return (
                    <li
                      key={item.id}
                      className="grid grid-cols-[3.25rem_2rem_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-border px-4 py-3 first:border-t-0 lg:px-6"
                    >
                      <time
                        dateTime={item.createdAt}
                        className="text-sm font-semibold tabular-nums"
                      >
                        {formatAuditTime(item.createdAt)}
                      </time>
                      <ActorAvatar item={item} />
                      <div className="min-w-0">
                        <p className="text-sm">
                          <AuditSentence item={item} />
                        </p>
                        {item.subject?.contractCode || item.detail ? (
                          <p className="mt-0.5 truncate text-xs text-neutral">
                            {[
                              item.subject?.contractCode
                                ? `Contrato ${item.subject.contractCode}`
                                : null,
                              item.detail,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge
                          label={AUDIT_CATEGORY_LABELS[category]}
                          variant={AUDIT_CATEGORY_VARIANTS[category]}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Ver detalhes de ${item.summary}`}
                          onClick={() => setSelectedLog(item)}
                        >
                          Ver detalhes
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

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
