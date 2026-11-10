import * as Dialog from '@radix-ui/react-dialog';
import {
  CheckCircle2,
  CircleHelp,
  CircleX,
  CreditCard,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getAttemptResultLabel } from '@/features/collection-cases/utils/collection-case-labels';
import { useRecoveryAudit } from '@/features/ranking/hooks/use-recovery-audit';
import {
  type RecoveryAuditCase,
  type RecoveryAuditCheckStatus,
  type RecoveryRankingPeriod,
} from '@/features/ranking/types/ranking-api.types';
import {
  formatCurrencyFromDecimalString,
  formatDateOnlyPtBR,
  formatDateTimePtBR,
  formatInteger,
} from '@/utils/formatters';

type RecoveryAuditDrawerProps = {
  agent: { userId: string; name: string } | null;
  period: RecoveryRankingPeriod;
  onClose: () => void;
};

const CHECK_STYLES: Record<
  RecoveryAuditCheckStatus,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  ok: { icon: CheckCircle2, className: 'text-success', label: 'Confere' },
  fail: { icon: CircleX, className: 'text-danger', label: 'Não confere' },
  unknown: {
    icon: CircleHelp,
    className: 'text-warning',
    label: 'Não conferido',
  },
};

function CheckRow({ check }: { check: RecoveryAuditCase['checks'][number] }) {
  const style = CHECK_STYLES[check.status];
  const Icon = style.icon;

  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <Icon
        className={cn('mt-0.5 h-4 w-4 shrink-0', style.className)}
        aria-label={style.label}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{check.label}</p>
        <p className="text-xs text-neutral">{check.detail}</p>
      </div>
    </li>
  );
}

function CaseCard({ item }: { item: RecoveryAuditCase }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{item.customerName}</p>
          <p className="text-xs text-neutral">
            Contrato {item.contractCode} · recuperado em{' '}
            {formatDateTimePtBR(item.recoveredAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold tabular-nums">
            {formatCurrencyFromDecimalString(item.recoveredAmount)}
          </p>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
              item.verified
                ? 'bg-success/10 text-success'
                : 'bg-warning/15 text-warning',
            )}
          >
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {item.verified ? 'Verificado' : 'Revisar'}
          </span>
        </div>
      </header>

      <ul className="mt-3 divide-y divide-border border-t border-border">
        {item.checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </ul>

      <div className="mt-3 grid gap-3 border-t border-border pt-3 md:grid-cols-2">
        <section aria-label="Contatos registrados">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Contatos da atendente
          </p>
          {item.contacts.length === 0 ? (
            <p className="text-xs text-neutral">
              Nenhum contato manual no ciclo.
            </p>
          ) : (
            <ul className="space-y-1.5">
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
                    <p className="mt-0.5 line-clamp-2 text-neutral">
                      “{contact.notes}”
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Pagamento no ERP">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral">
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            Pagamento no ERP
          </p>
          {!item.paymentsAvailable ? (
            <p className="text-xs text-warning">
              ERP indisponível agora — pagamento não reconferido.
            </p>
          ) : item.payments.length === 0 ? (
            <p className="text-xs text-danger">
              Nenhuma baixa com forma de pagamento.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {item.payments.map((payment, index) => (
                <li
                  key={`${payment.titleNumber ?? 'titulo'}-${index}`}
                  className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs"
                >
                  <p className="font-medium">
                    Baixa em {formatDateOnlyPtBR(payment.paidDate)}
                    {payment.paymentForm ? ` · ${payment.paymentForm}` : ''}
                  </p>
                  <p className="text-neutral">
                    Título {payment.titleNumber ?? '—'} ·{' '}
                    {formatCurrencyFromDecimalString(payment.amount)}
                    {payment.registeredAt
                      ? ` · lançada no ERP em ${formatDateTimePtBR(payment.registeredAt)}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}

export function RecoveryAuditDrawer({
  agent,
  period,
  onClose,
}: RecoveryAuditDrawerProps) {
  const query = useRecoveryAudit(agent?.userId ?? null, period);
  const data = query.data;

  return (
    <Dialog.Root
      open={agent !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-background shadow-modal data-[state=open]:animate-fade-in">
          <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold">
                Conferência do crédito · {agent?.name}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-neutral">
                Como cada valor chegou ao ranking: pagamento confirmado no ERP,
                contato da atendente antes do pagamento e as verificações
                feitas.
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

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {query.isLoading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            ) : null}

            {query.isError ? (
              <ErrorState
                title="Não foi possível carregar a conferência"
                description="Tente novamente em instantes."
                retryLabel="Tentar novamente"
                onRetry={() => {
                  void query.refetch();
                }}
              />
            ) : null}

            {data ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/55 px-3 py-2.5">
                    <p className="text-xs text-neutral">Recuperações</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatInteger(data.cases.length)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/55 px-3 py-2.5">
                    <p className="text-xs text-neutral">Valor creditado</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatCurrencyFromDecimalString(data.totalAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-success/10 px-3 py-2.5">
                    <p className="text-xs text-success">Verificadas</p>
                    <p className="text-lg font-bold tabular-nums text-success">
                      {formatInteger(data.verifiedCases)} de{' '}
                      {formatInteger(data.cases.length)}
                    </p>
                  </div>
                </div>

                {!data.erpAvailable ? (
                  <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
                    O ERP não respondeu agora: o pagamento não pôde ser
                    reconferido. Tente novamente mais tarde.
                  </p>
                ) : null}

                {data.cases.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral">
                    Nenhuma recuperação neste período.
                  </p>
                ) : (
                  data.cases.map((item) => (
                    <CaseCard key={item.caseId} item={item} />
                  ))
                )}
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
