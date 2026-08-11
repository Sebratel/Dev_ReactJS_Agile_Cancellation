import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { PageContainer } from '@/components/navigation/page-container';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
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
  getCollectionStatusLabel,
  getCollectionStatusVariant,
  canSendCaseToCancellation,
  canRevertCaseCancellation,
  getInvoiceStatusLabel,
  getPriorityLabel,
  getPriorityVariant,
  getPromiseStatusLabel,
  getPromiseStatusVariant,
  getSlaPresentation,
} from '@/features/collection-cases/utils/collection-case-labels';
import { ApiError } from '@/services/api/api-error';
import {
  formatCurrencyFromDecimalString,
  formatDatePtBR,
  formatDateTimePtBR,
  formatInteger,
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

export default function CollectionCaseDetailPage() {
  const { caseId = '' } = useParams<{ caseId: string }>();
  const caseQuery = useCollectionCase(caseId);
  const location = useLocation();
  const { session } = useAuth();

  const fromMyCollection = location.pathname.startsWith('/minha-cobranca');
  const backTo = fromMyCollection ? '/minha-cobranca' : '/supervisao';
  const backLabel = fromMyCollection
    ? 'Voltar para minha cobrança'
    : 'Voltar para supervisão';
  const canDistribute =
    session?.user.roles.some(
      (role) => role === 'ADMIN' || role === 'SUPERVISOR',
    ) ?? false;

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
          <PageHeader
            title={caseQuery.data.customer.name}
            description={`Contrato ${caseQuery.data.contract.code}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {canSendCaseToCancellation({
                  status: caseQuery.data.status,
                  cancellationProcess: caseQuery.data.cancellationProcess,
                }) ? (
                  <SendToCancellationAction caseId={caseQuery.data.id} />
                ) : null}
                {canRevertCaseCancellation(caseQuery.data.status) ? (
                  <RevertCancellationAction caseId={caseQuery.data.id} />
                ) : null}
                <StatusBadge
                  label={getCollectionStatusLabel(caseQuery.data.status)}
                  variant={getCollectionStatusVariant(caseQuery.data.status)}
                />
                <StatusBadge
                  label={getPriorityLabel(caseQuery.data.priority)}
                  variant={getPriorityVariant(caseQuery.data.priority)}
                />
              </div>
            }
          >
            <dl className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Valor em aberto
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {formatCurrencyFromDecimalString(
                    caseQuery.data.outstandingAmount,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Dias em atraso
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {formatInteger(caseQuery.data.daysOverdue)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  SLA
                </dt>
                <dd className="mt-1">
                  <StatusBadge
                    label={getSlaPresentation(caseQuery.data.slaDueAt).label}
                    variant={
                      getSlaPresentation(caseQuery.data.slaDueAt).variant
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Responsável
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {caseQuery.data.assignedTo?.name ?? 'Não atribuído'}
                </dd>
              </div>
            </dl>
          </PageHeader>

          <div className="flex flex-col gap-6 xl:flex-row-reverse xl:items-start">
            <div className="flex flex-col gap-6 xl:sticky xl:top-[72px] xl:w-80 xl:shrink-0">
              <SectionCard
                title="Resumo"
                description="Dados consolidados do cliente, contrato e posição financeira."
              >
                <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <dt className="font-medium text-neutral">Cliente</dt>
                    <dd className="mt-1">{caseQuery.data.customer.name}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral">Documento</dt>
                    <dd className="mt-1">{caseQuery.data.customer.document}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral">
                      Código do contrato
                    </dt>
                    <dd className="mt-1">{caseQuery.data.contract.code}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral">
                      Status do contrato
                    </dt>
                    <dd className="mt-1">{caseQuery.data.contract.status}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral">
                      Total consolidado
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {formatCurrencyFromDecimalString(
                        caseQuery.data.totalOutstanding ??
                          caseQuery.data.outstandingAmount,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral">Responsável</dt>
                    <dd className="mt-1">
                      {caseQuery.data.assignedTo?.name ?? 'Não atribuído'}
                    </dd>
                  </div>
                </dl>
              </SectionCard>

              {canDistribute ? (
                <AssignCaseAction
                  caseId={caseQuery.data.id}
                  currentAssigneeId={caseQuery.data.assignedTo?.id ?? null}
                />
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
              {(caseQuery.data.invoices ?? []).length > 0 ? (
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
                              {formatDatePtBR(invoice.dueDate)}
                            </td>
                            <td className={tableCellClassName}>
                              {formatCurrencyFromDecimalString(invoice.amount)}
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

              <CreateCollectionAttemptForm caseId={caseQuery.data.id} />

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
                          <th className={tableCellClassName}>Resultado</th>
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
                              {getAttemptChannelLabel(attempt.channel)}
                            </td>
                            <td className={tableCellClassName}>
                              {getAttemptResultLabel(attempt.result)}
                            </td>
                            <td className={tableCellClassName}>
                              {formatDatePtBR(attempt.attemptedAt)}
                            </td>
                            <td className={tableCellClassName}>
                              {attempt.nextContactAt
                                ? formatDateTimePtBR(attempt.nextContactAt)
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
                          <th className={tableCellClassName}>Data prometida</th>
                          <th className={tableCellClassName}>Observação</th>
                          <th className={tableCellClassName}>Criado em</th>
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
                                label={getPromiseStatusLabel(promise.status)}
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

              {caseQuery.data.cancellationProcess ? (
                <CancellationProcessSection
                  caseId={caseQuery.data.id}
                  cancellationProcess={caseQuery.data.cancellationProcess}
                />
              ) : null}

              <CaseNotesSection caseId={caseQuery.data.id} />

              <CollectionCaseTimeline caseId={caseQuery.data.id} />
            </div>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
