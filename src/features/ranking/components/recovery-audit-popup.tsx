import * as Dialog from '@radix-ui/react-dialog';
import { Phone, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getAttemptResultLabel } from '@/features/collection-cases/utils/collection-case-labels';
import { RecoveryAuditTimeline } from '@/features/ranking/components/recovery-audit-timeline';
import { type RecoveryAuditCase } from '@/features/ranking/types/ranking-api.types';
import {
  formatCurrencyFromDecimalString,
  formatDateTimePtBR,
  formatInteger,
} from '@/utils/formatters';

type RecoveryAuditPopupProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  erpAvailable?: boolean;
  cases: RecoveryAuditCase[];
  // Resumo do período (só no ranking, com vários casos).
  summary?: { totalAmount: string; verifiedCases: number } | null;
};

function CaseBanner({ item }: { item: RecoveryAuditCase }) {
  const pending = item.checks.filter((check) => check.status !== 'ok').length;
  const name = item.assignedTo?.name ?? 'a atendente';
  const amount = formatCurrencyFromDecimalString(item.recoveredAmount);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-3',
        item.verified
          ? 'bg-success/10 text-success'
          : 'bg-warning/15 text-warning',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        {item.verified
          ? `Receita confirmada para ${name}`
          : `Receita creditada a ${name} — ${pending} etapa(s) não confirmada(s)`}
      </span>
      <span className="text-xl font-bold tabular-nums">{amount}</span>
    </div>
  );
}

function CaseView({ item }: { item: RecoveryAuditCase }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{item.customerName}</p>
          <p className="text-xs text-neutral">
            Contrato {item.contractCode} · recuperado em{' '}
            {formatDateTimePtBR(item.recoveredAt)}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
            item.verified
              ? 'bg-success/10 text-success'
              : 'bg-warning/15 text-warning',
          )}
        >
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {item.verified ? 'Verificado' : 'Revisar'}
        </span>
      </div>

      <RecoveryAuditTimeline item={item} />

      <CaseBanner item={item} />

      <details className="rounded-lg border border-border">
        <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral">
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          Todos os contatos do ciclo ({formatInteger(item.contacts.length)})
        </summary>
        {item.contacts.length === 0 ? (
          <p className="px-3 pb-3 text-xs text-neutral">
            Nenhum contato manual no ciclo.
          </p>
        ) : (
          <ul className="space-y-1.5 px-3 pb-3">
            {item.contacts.map((contact) => (
              <li
                key={contact.id}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs',
                  contact.credited
                    ? 'bg-success/10 ring-1 ring-success/30'
                    : 'bg-muted/50',
                )}
              >
                <p className="font-medium">
                  {formatDateTimePtBR(contact.attemptedAt)} ·{' '}
                  {getAttemptResultLabel(contact.result)}
                </p>
                <p className="text-neutral">
                  {contact.performedBy?.name ?? 'Usuário removido'}
                  {contact.credited
                    ? ' · sustenta o crédito'
                    : !contact.effective
                      ? ' · não conta (sem contato efetivo)'
                      : contact.beforePayment === false
                        ? ' · depois do pagamento'
                        : ''}
                </p>
                {contact.notes ? (
                  <p className="mt-0.5 text-neutral">“{contact.notes}”</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}

export function RecoveryAuditPopup({
  open,
  onClose,
  title,
  description,
  isLoading = false,
  isError = false,
  onRetry,
  erpAvailable = true,
  cases,
  summary = null,
}: RecoveryAuditPopupProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Ao abrir (ou trocar de atendente) começa no primeiro caso.
  useEffect(() => {
    setSelectedId(null);
  }, [open, cases.length]);

  const selected =
    cases.find((item) => item.caseId === selectedId) ?? cases[0] ?? null;

  let body: ReactNode = null;

  if (isLoading) {
    body = (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  } else if (isError) {
    body = (
      <ErrorState
        title="Não foi possível carregar a conferência"
        description="Tente novamente em instantes."
        retryLabel="Tentar novamente"
        onRetry={onRetry}
      />
    );
  } else {
    body = (
      <div className="space-y-4">
        {summary ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/55 px-3 py-2">
              <p className="text-xs text-neutral">Recuperações</p>
              <p className="text-lg font-bold tabular-nums">
                {formatInteger(cases.length)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/55 px-3 py-2">
              <p className="text-xs text-neutral">Receita creditada</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrencyFromDecimalString(summary.totalAmount)}
              </p>
            </div>
            <div className="rounded-lg bg-success/10 px-3 py-2">
              <p className="text-xs text-success">Verificadas</p>
              <p className="text-lg font-bold tabular-nums text-success">
                {formatInteger(summary.verifiedCases)} de{' '}
                {formatInteger(cases.length)}
              </p>
            </div>
          </div>
        ) : null}

        {!erpAvailable ? (
          <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
            O ERP não respondeu agora: o pagamento não pôde ser reconferido.
            Tente novamente mais tarde.
          </p>
        ) : null}

        {cases.length > 1 ? (
          <div
            role="tablist"
            aria-label="Recuperações do período"
            className="flex flex-wrap gap-2"
          >
            {cases.map((item) => {
              const active = item.caseId === selected?.caseId;

              return (
                <button
                  key={item.caseId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedId(item.caseId);
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary/60 bg-primary/15 text-foreground'
                      : 'border-border text-neutral hover:bg-muted',
                  )}
                >
                  {item.customerName} ·{' '}
                  {formatCurrencyFromDecimalString(item.recoveredAmount)}
                </button>
              );
            })}
          </div>
        ) : null}

        {selected ? (
          <CaseView item={selected} />
        ) : (
          <p className="py-8 text-center text-sm text-neutral">
            Nenhuma recuperação neste período.
          </p>
        )}
      </div>
    );
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-card shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-neutral">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar conferência"
                className="rounded-md p-1.5 text-neutral hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </header>

          <div className="overflow-y-auto p-5">{body}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
