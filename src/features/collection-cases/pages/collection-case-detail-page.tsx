import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  HandCoins,
  History,
  ListChecks,
  MessageCircle,
  MessageSquareText,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { PageContainer } from '@/components/navigation/page-container';
import { HsmDeliveryBadge } from '@/features/collection-cases/components/hsm-delivery-badge';
import { ContactCustomerWhatsAppAction } from '@/features/collection-cases/components/contact-customer-whatsapp-action';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
import { hasAnyRole } from '@/features/auth/utils/role-utils';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { CancellationProcessSection } from '@/features/collection-cases/components/cancellation-process-section';
import { CaseNotesSection } from '@/features/collection-cases/components/case-notes-section';
import { AssignCaseAction } from '@/features/collection-cases/components/assign-case-action';
import { SendToCancellationAction } from '@/features/collection-cases/components/send-to-cancellation-action';
import { RevertCancellationAction } from '@/features/collection-cases/components/revert-cancellation-action';
import { CreateCollectionAttemptForm } from '@/features/collection-cases/components/create-collection-attempt-form';
import { CollectionCaseTimeline } from '@/features/collection-cases/components/collection-case-timeline';
import { CreatePaymentPromiseForm } from '@/features/collection-cases/components/create-payment-promise-form';
import { PaymentPromiseActions } from '@/features/collection-cases/components/payment-promise-actions';
import { useCollectionCase } from '@/features/collection-cases/hooks/use-collection-cases';
import { useHighlightOnGrow } from '@/hooks/use-highlight-on-grow';
import {
  getAttemptChannelLabel,
  getAttemptResultLabel,
  getCaseOriginLabel,
  getCaseOriginVariant,
  getCollectionStatusLabel,
  getCollectionStatusVariant,
  canSendCaseToCancellation,
  canRevertCaseCancellation,
  getInvoiceStatusLabel,
  getPriorityLabel,
  getPriorityVariant,
  getPromiseStatusLabel,
  getPromiseStatusVariant,
  isCreditLockedStatus,
} from '@/features/collection-cases/utils/collection-case-labels';
import {
  SEVERITY_TEXT_CLASS,
  getOverdueSeverity,
  getVisibleSla,
} from '@/features/collection-cases/utils/case-row-presentation';
import { getContractStatusLabel } from '@/features/customers/utils/customer-labels';
import { ApiError } from '@/services/api/api-error';
import {
  formatCurrencyFromDecimalString,
  formatDateOnlyPtBR,
  formatDatePtBR,
  formatDateTimePtBR,
  formatInteger,
  formatRelativeTimePtBR,
} from '@/utils/formatters';

function DetailLoadingState() {
  return (
    <>
      <TableSkeleton rows={2} columns={3} />
      <TableSkeleton rows={4} columns={4} />
    </>
  );
}

const tableHeadClassName =
  'bg-muted text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral';

const tableCellClassName = 'px-4 py-3 lg:px-6';

type CaseWorkspaceModule =
  | 'invoices'
  | 'attempts'
  | 'promises'
  | 'cancellation'
  | 'timeline'
  | 'notes';

type CaseWorkspaceItem = {
  id: CaseWorkspaceModule;
  label: string;
  description: string;
  badge: string;
  icon: LucideIcon;
};

const workspaceItemsBase: Omit<CaseWorkspaceItem, 'badge'>[] = [
  {
    id: 'attempts',
    label: 'Tentativas',
    description: 'Registrar contato',
    icon: MessageCircle,
  },
  {
    id: 'promises',
    label: 'Promessas',
    description: 'Acordos e datas',
    icon: HandCoins,
  },
  {
    id: 'cancellation',
    label: 'Cancelamento',
    description: 'Checklist operacional',
    icon: ListChecks,
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Histórico do caso',
    icon: History,
  },
  {
    id: 'notes',
    label: 'Comentários',
    description: 'Notas internas',
    icon: MessageSquareText,
  },
  {
    id: 'invoices',
    label: 'Faturas',
    description: 'Títulos e valores',
    icon: FileText,
  },
];

// Abas finas com um indicador que desliza até a aba ativa.
function CaseWorkspaceTabs({
  activeModule,
  items,
  onChange,
}: {
  activeModule: CaseWorkspaceModule;
  items: CaseWorkspaceItem[];
  onChange: (module: CaseWorkspaceModule) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measure = useCallback(() => {
    const active = listRef.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );

    if (active) {
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    }
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [activeModule, items, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return (
    <section className="sticky top-[72px] z-10 rounded-lg border border-border/80 bg-card shadow-card animate-rise-in">
      <div
        ref={listRef}
        className="relative flex gap-1 overflow-x-auto px-2"
        role="tablist"
        aria-label="Módulos do caso"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60',
                isActive
                  ? 'text-foreground'
                  : 'text-neutral hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors duration-200',
                  isActive
                    ? 'bg-primary/20 text-foreground'
                    : 'bg-muted text-neutral',
                )}
              >
                {item.badge}
              </span>
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-primary transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
          }}
        />
      </div>
    </section>
  );
}

function CaseKpi({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-r border-border px-5 first:pl-0 last:border-r-0">
      <dt className="text-[11px] text-neutral">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 text-neutral">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

export default function CollectionCaseDetailPage() {
  const { caseId = '' } = useParams<{ caseId: string }>();
  const [activeWorkspaceModule, setActiveWorkspaceModule] =
    useState<CaseWorkspaceModule>('attempts');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const caseQuery = useCollectionCase(caseId);

  const handleCopyPhone = useCallback((phone: string) => {
    void navigator.clipboard.writeText(phone).then(() => {
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    });
  }, []);
  const location = useLocation();
  const { session } = useAuth();

  const fromMyCollection = location.pathname.startsWith('/minha-cobranca');
  const fromCancellations = location.pathname.startsWith('/cancelamentos');
  const backTo = fromMyCollection
    ? '/minha-cobranca'
    : fromCancellations
      ? '/cancelamentos'
      : '/supervisao';
  const backLabel = fromMyCollection
    ? 'Voltar para minha cobrança'
    : fromCancellations
      ? 'Voltar para cancelamentos'
      : 'Voltar para supervisão';
  const canDistribute =
    session?.user.roles.some(
      (role) => role === 'ADMIN' || role === 'SUPERVISOR',
    ) ?? false;

  const settingsQuery = useSettings();
  const userRoles = session?.user.roles ?? [];
  // SUPERVISOR/ADMIN sempre podem; atendente só quando o admin libera a chave
  // global. Espelha a regra do backend (assertCanSendToCancellation).
  const canSendToCancellationByRole =
    hasAnyRole(userRoles, ['ADMIN', 'SUPERVISOR']) ||
    (settingsQuery.data?.allowAgentSendToCancellation === true &&
      hasAnyRole(userRoles, ['COLLECTION_AGENT']));

  const attemptsCount = caseQuery.data
    ? (caseQuery.data.attempts.length > 0
        ? caseQuery.data.attempts
        : caseQuery.data.recentAttempts
      ).length
    : 0;
  const promisesCount = caseQuery.data
    ? caseQuery.data.promises.length > 0
      ? caseQuery.data.promises.length
      : caseQuery.data.activePromise
        ? 1
        : 0
    : 0;
  const invoicesCount = caseQuery.data?.invoices?.length ?? 0;
  // O detalhe não traz "último contato": usa a tentativa mais recente.
  const attemptDates = caseQuery.data
    ? [...caseQuery.data.attempts, ...caseQuery.data.recentAttempts]
        .map((attempt) => attempt.attemptedAt)
        .sort()
    : [];
  const lastContactAt = attemptDates[attemptDates.length - 1] ?? null;
  const workspaceItems: CaseWorkspaceItem[] = workspaceItemsBase.map((item) => {
    if (item.id === 'attempts') {
      return { ...item, badge: formatInteger(attemptsCount) };
    }

    if (item.id === 'promises') {
      return { ...item, badge: formatInteger(promisesCount) };
    }

    if (item.id === 'cancellation') {
      return {
        ...item,
        badge: caseQuery.data?.cancellationProcess ? 'Ativo' : 'Pendente',
      };
    }

    if (item.id === 'invoices') {
      return { ...item, badge: formatInteger(invoicesCount) };
    }

    if (item.id === 'timeline') {
      return { ...item, badge: 'Live' };
    }

    return { ...item, badge: 'Interno' };
  });
  const highlightAttempts = useHighlightOnGrow(attemptsCount);
  const highlightPromises = useHighlightOnGrow(promisesCount);

  const handleRetry = () => {
    void caseQuery.refetch();
  };

  const isNotFound =
    caseQuery.isError &&
    caseQuery.error instanceof ApiError &&
    caseQuery.error.status === 404;

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          to={backTo}
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
      </div>

      {caseQuery.isLoading ? <DetailLoadingState /> : null}

      {caseQuery.isError ? (
        <ErrorState
          title={
            isNotFound
              ? 'Caso não encontrado'
              : 'Não foi possível carregar o caso'
          }
          description={
            isNotFound
              ? 'O identificador informado não corresponde a nenhum caso de cobrança ativo.'
              : 'Não foi possível conectar ao servidor. Tente novamente ou entre em contato com o suporte.'
          }
          retryLabel={isNotFound ? undefined : 'Tentar novamente'}
          onRetry={isNotFound ? undefined : handleRetry}
        />
      ) : null}

      {!caseQuery.isLoading && !caseQuery.isError && caseQuery.data ? (
        <>
          <header className="flex flex-col gap-3 border-b border-border/70 pb-3 animate-rise-in">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div
                  className="h-1 w-9 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight">
                  {caseQuery.data.customer.name}
                </h1>
                <p className="text-sm text-neutral">
                  Contrato <span>{caseQuery.data.contract.code}</span> ·
                  Documento <span>{caseQuery.data.customer.document}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={getCollectionStatusLabel(caseQuery.data.status)}
                  variant={getCollectionStatusVariant(caseQuery.data.status)}
                />
                <StatusBadge
                  label={getPriorityLabel(caseQuery.data.priority)}
                  variant={getPriorityVariant(caseQuery.data.priority)}
                />
                {caseQuery.data.matrixContact.awaitingReply ? (
                  <StatusBadge label="Aguardando Matrix" variant="warning" />
                ) : null}
                <HsmDeliveryBadge
                  state={caseQuery.data.matrixContact.deliveryState}
                  detail={caseQuery.data.matrixContact.deliveryDetail}
                />
                {caseQuery.data.origin !== 'ERP_SYNC' ? (
                  <StatusBadge
                    label={getCaseOriginLabel(caseQuery.data.origin)}
                    variant={getCaseOriginVariant(caseQuery.data.origin)}
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <dl className="flex flex-wrap items-center gap-y-2">
                <CaseKpi label="Em aberto">
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrencyFromDecimalString(
                      caseQuery.data.outstandingAmount,
                    )}
                  </span>
                </CaseKpi>
                <CaseKpi label="Em atraso">
                  <span
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      SEVERITY_TEXT_CLASS[
                        getOverdueSeverity(caseQuery.data.daysOverdue)
                      ],
                    )}
                  >
                    {formatInteger(caseQuery.data.daysOverdue)} dias
                  </span>
                </CaseKpi>
                {getVisibleSla(caseQuery.data.slaDueAt) ? (
                  <CaseKpi label="SLA">
                    <StatusBadge
                      label={getVisibleSla(caseQuery.data.slaDueAt)!.label}
                      variant={getVisibleSla(caseQuery.data.slaDueAt)!.variant}
                    />
                  </CaseKpi>
                ) : null}
                <CaseKpi label="Responsável">
                  {caseQuery.data.assignedTo?.name ?? 'Não atribuído'}
                </CaseKpi>
                <CaseKpi label="Último contato">
                  <span
                    title={
                      lastContactAt
                        ? formatDateTimePtBR(lastContactAt)
                        : undefined
                    }
                  >
                    {lastContactAt
                      ? formatRelativeTimePtBR(lastContactAt)
                      : 'Sem contato'}
                  </span>
                </CaseKpi>
              </dl>

              <div className="flex flex-wrap items-center gap-2">
                <ContactCustomerWhatsAppAction
                  caseId={caseQuery.data.id}
                  customerName={caseQuery.data.customer.name}
                  customerPhone={caseQuery.data.customer.phone ?? null}
                />
                {canSendToCancellationByRole &&
                canSendCaseToCancellation({
                  status: caseQuery.data.status,
                  cancellationProcess: caseQuery.data.cancellationProcess,
                }) ? (
                  <SendToCancellationAction caseId={caseQuery.data.id} />
                ) : null}
                {canRevertCaseCancellation(caseQuery.data.status) ? (
                  <RevertCancellationAction caseId={caseQuery.data.id} />
                ) : null}
              </div>
            </div>
          </header>

          <div className="flex flex-col gap-6 xl:flex-row-reverse xl:items-start">
            <div className="flex flex-col gap-6 xl:sticky xl:top-[72px] xl:w-72 xl:shrink-0">
              <SectionCard title="Resumo" contentClassName="p-0">
                <dl className="divide-y divide-border/60 text-sm">
                  {caseQuery.data.customer.phone ? (
                    <SummaryRow label="Telefone 1">
                      <span className="inline-flex items-center gap-2">
                        <span className="tabular-nums">
                          {caseQuery.data.customer.phone}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyPhone(caseQuery.data.customer.phone!)
                          }
                          className="text-neutral transition-colors hover:text-foreground"
                          title="Copiar telefone"
                        >
                          {copiedPhone === caseQuery.data.customer.phone ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </span>
                    </SummaryRow>
                  ) : null}
                  {caseQuery.data.customer.phone2 ? (
                    <SummaryRow label="Telefone 2">
                      <span className="inline-flex items-center gap-2">
                        <span className="tabular-nums">
                          {caseQuery.data.customer.phone2}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyPhone(caseQuery.data.customer.phone2!)
                          }
                          className="text-neutral transition-colors hover:text-foreground"
                          title="Copiar telefone"
                        >
                          {copiedPhone === caseQuery.data.customer.phone2 ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </span>
                    </SummaryRow>
                  ) : null}
                  <SummaryRow label="Status do contrato">
                    {caseQuery.data.contract.erpStatus ??
                      getContractStatusLabel(caseQuery.data.contract.status)}
                  </SummaryRow>
                  {caseQuery.data.contract.cancellationReason ? (
                    <SummaryRow label="Motivo do encerramento">
                      <span className="inline-flex flex-wrap items-center justify-end gap-2">
                        <span className="font-medium">
                          {caseQuery.data.contract.cancellationReason}
                        </span>
                        {caseQuery.data.contract.cancellationReasonCategory ===
                        'INADIMPLENCIA' ? (
                          <span className="inline-flex rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                            Inadimplência
                          </span>
                        ) : caseQuery.data.contract
                            .cancellationReasonCategory === 'EXTERNO' ? (
                          <span className="inline-flex rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                            Motivo externo
                          </span>
                        ) : null}
                      </span>
                    </SummaryRow>
                  ) : null}
                  <SummaryRow label="Total consolidado">
                    <span className="font-semibold tabular-nums">
                      {formatCurrencyFromDecimalString(
                        caseQuery.data.totalOutstanding ??
                          caseQuery.data.outstandingAmount,
                      )}
                    </span>
                  </SummaryRow>
                </dl>
              </SectionCard>

              {canDistribute && !isCreditLockedStatus(caseQuery.data.status) ? (
                <AssignCaseAction
                  caseId={caseQuery.data.id}
                  currentAssigneeId={caseQuery.data.assignedTo?.id ?? null}
                  targetRole={
                    caseQuery.data.status === 'CANCELLATION_IN_PROGRESS'
                      ? 'CANCELLATION_AGENT'
                      : 'COLLECTION_AGENT'
                  }
                />
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <CaseWorkspaceTabs
                activeModule={activeWorkspaceModule}
                items={workspaceItems}
                onChange={setActiveWorkspaceModule}
              />

              {/* A chave muda com a aba: o conteúdo novo entra com fade e subida. */}
              <div
                key={activeWorkspaceModule}
                className="flex flex-col gap-6 motion-safe:animate-rise-in-md"
              >
                {activeWorkspaceModule === 'invoices' &&
                (caseQuery.data.invoices ?? []).length > 0 ? (
                  <SectionCard
                    title="Faturas"
                    description="Títulos vinculados ao contrato em cobrança."
                    contentClassName="p-0"
                  >
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className={tableHeadClassName}>
                          <tr>
                            <th className={tableCellClassName}>Número</th>
                            <th className={tableCellClassName}>Vencimento</th>
                            <th className={tableCellClassName}>Valor</th>
                            <th className={tableCellClassName}>Pago</th>
                            <th className={tableCellClassName}>Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card text-sm">
                          {(caseQuery.data.invoices ?? []).map((invoice) => (
                            <tr key={invoice.id}>
                              <td className={tableCellClassName}>
                                {invoice.invoiceNumber ?? invoice.id}
                              </td>
                              <td className={tableCellClassName}>
                                {formatDateOnlyPtBR(invoice.dueDate)}
                              </td>
                              <td className={tableCellClassName}>
                                {formatCurrencyFromDecimalString(
                                  invoice.amount,
                                )}
                              </td>
                              <td className={tableCellClassName}>
                                {formatCurrencyFromDecimalString(
                                  invoice.paidAmount,
                                )}
                              </td>
                              <td className={tableCellClassName}>
                                {getInvoiceStatusLabel(invoice.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                ) : null}

                {activeWorkspaceModule === 'attempts' ? (
                  <div className="flex flex-col gap-6 animate-rise-in-md">
                    <CreateCollectionAttemptForm
                      caseId={caseQuery.data.id}
                      notesRequired={
                        caseQuery.data.status === 'CANCELLED_IN_RECOVERY'
                      }
                    />

                    <SectionCard
                      title="Tentativas de contato"
                      description="Histórico de abordagens registradas para o caso."
                      contentClassName="p-0"
                    >
                      {(caseQuery.data.attempts.length > 0
                        ? caseQuery.data.attempts
                        : caseQuery.data.recentAttempts
                      ).length > 0 ? (
                        <div
                          className={cn(
                            'overflow-x-auto',
                            highlightAttempts && 'animate-highlight-pulse',
                          )}
                        >
                          <table className="min-w-full divide-y divide-border">
                            <thead className={tableHeadClassName}>
                              <tr>
                                <th className={tableCellClassName}>Canal</th>
                                <th className={tableCellClassName}>
                                  Resultado
                                </th>
                                <th className={tableCellClassName}>Data</th>
                                <th className={tableCellClassName}>
                                  Próximo contato
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card text-sm">
                              {(caseQuery.data.attempts.length > 0
                                ? caseQuery.data.attempts
                                : caseQuery.data.recentAttempts
                              ).map((attempt) => (
                                <tr key={attempt.id}>
                                  <td className={tableCellClassName}>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {getAttemptChannelLabel(attempt.channel)}
                                      {attempt.isAutomatic ? (
                                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral">
                                          Automático
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className={tableCellClassName}>
                                    {getAttemptResultLabel(attempt.result)}
                                  </td>
                                  <td className={tableCellClassName}>
                                    {formatDatePtBR(attempt.attemptedAt)}
                                  </td>
                                  <td className={tableCellClassName}>
                                    {attempt.nextContactAt
                                      ? formatDateTimePtBR(
                                          attempt.nextContactAt,
                                        )
                                      : 'Não informado'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="px-4 py-4 text-sm text-neutral lg:px-6">
                          Nenhuma tentativa registrada para este caso.
                        </p>
                      )}
                    </SectionCard>
                  </div>
                ) : null}

                {activeWorkspaceModule === 'promises' ? (
                  <div className="flex flex-col gap-6 animate-rise-in-md">
                    <CreatePaymentPromiseForm caseId={caseQuery.data.id} />

                    <SectionCard
                      title="Promessas de pagamento"
                      description="Acordos registrados para regularização do contrato."
                      contentClassName="p-0"
                    >
                      {(caseQuery.data.promises.length > 0
                        ? caseQuery.data.promises
                        : caseQuery.data.activePromise
                          ? [caseQuery.data.activePromise]
                          : []
                      ).length > 0 ? (
                        <div
                          className={cn(
                            'overflow-x-auto',
                            highlightPromises && 'animate-highlight-pulse',
                          )}
                        >
                          <table className="min-w-full divide-y divide-border">
                            <thead className={tableHeadClassName}>
                              <tr>
                                <th className={tableCellClassName}>Status</th>
                                <th className={tableCellClassName}>
                                  Valor prometido
                                </th>
                                <th className={tableCellClassName}>
                                  Data prometida
                                </th>
                                <th className={tableCellClassName}>
                                  Observação
                                </th>
                                <th className={tableCellClassName}>
                                  Criado em
                                </th>
                                <th className={tableCellClassName}>Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card text-sm">
                              {(caseQuery.data.promises.length > 0
                                ? caseQuery.data.promises
                                : caseQuery.data.activePromise
                                  ? [caseQuery.data.activePromise]
                                  : []
                              ).map((promise) => (
                                <tr key={promise.id}>
                                  <td className={tableCellClassName}>
                                    <StatusBadge
                                      label={getPromiseStatusLabel(
                                        promise.status,
                                      )}
                                      variant={getPromiseStatusVariant(
                                        promise.status,
                                      )}
                                    />
                                  </td>
                                  <td className={tableCellClassName}>
                                    {formatCurrencyFromDecimalString(
                                      promise.promisedAmount,
                                    )}
                                  </td>
                                  <td className={tableCellClassName}>
                                    {formatDatePtBR(promise.promisedDate)}
                                  </td>
                                  <td className={tableCellClassName}>
                                    {promise.notes?.trim()
                                      ? promise.notes
                                      : 'Não informado'}
                                  </td>
                                  <td className={tableCellClassName}>
                                    {promise.createdAt
                                      ? formatDatePtBR(promise.createdAt)
                                      : 'Não informado'}
                                  </td>
                                  <td className={tableCellClassName}>
                                    {promise.status === 'ACTIVE' ? (
                                      <PaymentPromiseActions
                                        caseId={caseQuery.data.id}
                                        promiseId={promise.id}
                                      />
                                    ) : (
                                      <span className="text-neutral">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="px-4 py-4 text-sm text-neutral lg:px-6">
                          Nenhuma promessa registrada para este caso.
                        </p>
                      )}
                    </SectionCard>
                  </div>
                ) : null}

                {activeWorkspaceModule === 'cancellation' &&
                caseQuery.data.cancellationProcess ? (
                  <CancellationProcessSection
                    caseId={caseQuery.data.id}
                    cancellationProcess={caseQuery.data.cancellationProcess}
                  />
                ) : null}

                {activeWorkspaceModule === 'cancellation' &&
                !caseQuery.data.cancellationProcess ? (
                  <SectionCard
                    title="Processo de cancelamento"
                    description="Checklist sequencial das etapas operacionais e integração Eleven."
                  >
                    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-background p-4 text-sm text-neutral sm:flex-row sm:items-center sm:justify-between">
                      <p>
                        Este caso ainda não possui processo de cancelamento
                        iniciado.
                      </p>
                      {canSendToCancellationByRole &&
                      canSendCaseToCancellation({
                        status: caseQuery.data.status,
                        cancellationProcess: caseQuery.data.cancellationProcess,
                      }) ? (
                        <SendToCancellationAction caseId={caseQuery.data.id} />
                      ) : null}
                    </div>
                  </SectionCard>
                ) : null}

                {activeWorkspaceModule === 'invoices' &&
                (caseQuery.data.invoices ?? []).length === 0 ? (
                  <SectionCard
                    title="Faturas"
                    description="Títulos vinculados ao contrato em cobrança."
                  >
                    <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-neutral">
                      Nenhuma fatura vinculada a este caso.
                    </p>
                  </SectionCard>
                ) : null}

                {activeWorkspaceModule === 'notes' ? (
                  <div className="animate-rise-in-md">
                    <CaseNotesSection caseId={caseQuery.data.id} />
                  </div>
                ) : null}

                {activeWorkspaceModule === 'timeline' ? (
                  <div className="animate-rise-in-md">
                    <CollectionCaseTimeline caseId={caseQuery.data.id} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
