import {
  CheckCircle2,
  CircleHelp,
  CircleX,
  CreditCard,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAttemptResultLabel } from '@/features/collection-cases/utils/collection-case-labels';
import {
  type RecoveryAuditCase,
  type RecoveryAuditCheckStatus,
} from '@/features/ranking/types/ranking-api.types';
import {
  formatCurrencyFromDecimalString,
  formatDateOnlyPtBR,
  formatDateTimePtBR,
} from '@/utils/formatters';

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

export function RecoveryAuditCaseCard({ item }: { item: RecoveryAuditCase }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{item.customerName}</p>
          <p className="text-xs text-neutral">
            Contrato {item.contractCode} · recuperado em{' '}
            {formatDateTimePtBR(item.recoveredAt)}
            {item.reactivatedAt
              ? ` · reativado em ${formatDateOnlyPtBR(item.reactivatedAt)}`
              : ''}
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
          {item.reactivatedAt ? (
            <p className="text-xs text-neutral">
              Cliente cancelado reativado: o valor é o pago depois da
              reativação, lido do ERP a cada rodada.
            </p>
          ) : !item.paymentsAvailable ? (
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
