import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { PageContainer } from '@/components/navigation/page-container';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useCustomer } from '@/features/customers/hooks/use-customers';
import {
  getContractStatusLabel,
  getContractStatusVariant,
  getInvoiceStatusLabel,
  getInvoiceStatusVariant,
} from '@/features/customers/utils/customer-labels';
import { ApiError } from '@/services/api/api-error';
import {
  formatCurrencyFromDecimalString,
  formatDatePtBR,
  formatInteger,
} from '@/utils/formatters';

export default function CustomerDetailPage() {
  const { customerId = '' } = useParams<{ customerId: string }>();
  const customerQuery = useCustomer(customerId);

  const handleRetry = () => {
    void customerQuery.refetch();
  };

  const isNotFound =
    customerQuery.isError &&
    customerQuery.error instanceof ApiError &&
    customerQuery.error.status === 404;

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          to="/clientes"
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para clientes
        </Link>
      </div>

      {customerQuery.isLoading ? (
        <>
          <TableSkeleton rows={2} columns={3} />
          <TableSkeleton rows={4} columns={4} />
        </>
      ) : null}

      {customerQuery.isError ? (
        <ErrorState
          title={
            isNotFound ? 'Cliente não encontrado' : 'Não foi possível carregar'
          }
          description={
            isNotFound
              ? 'O identificador informado não corresponde a nenhum cliente.'
              : 'Tente novamente ou entre em contato com o suporte.'
          }
          retryLabel={isNotFound ? undefined : 'Tentar novamente'}
          onRetry={isNotFound ? undefined : handleRetry}
        />
      ) : null}

      {!customerQuery.isLoading &&
      !customerQuery.isError &&
      customerQuery.data ? (
        <>
          <PageHeader
            title={customerQuery.data.name}
            description={`Documento ${customerQuery.data.document}`}
          >
            <dl className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Vencido
                </dt>
                <dd
                  className={cn(
                    'mt-1 text-lg font-bold tabular-nums',
                    customerQuery.data.overdueInvoicesCount > 0
                      ? 'text-danger'
                      : 'text-success',
                  )}
                >
                  {formatCurrencyFromDecimalString(
                    customerQuery.data.overdueAmount,
                  )}
                  {customerQuery.data.overdueInvoicesCount > 0 ? (
                    <span className="ml-1.5 text-xs font-normal text-danger/70">
                      ({formatInteger(customerQuery.data.overdueInvoicesCount)}{' '}
                      {customerQuery.data.overdueInvoicesCount === 1
                        ? 'fatura'
                        : 'faturas'}
                      )
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Total em aberto
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {formatCurrencyFromDecimalString(
                    customerQuery.data.totalOutstanding,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Faturas em aberto
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {formatInteger(customerQuery.data.openInvoicesCount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  E-mail
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {customerQuery.data.email ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-neutral">
                  Telefone
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {customerQuery.data.phone ?? '—'}
                </dd>
              </div>
            </dl>
          </PageHeader>

          <SectionCard
            title="Contratos"
            description="Contratos vinculados a este cliente."
          >
            {customerQuery.data.contracts.length === 0 ? (
              <EmptyState
                title="Sem contratos"
                description="Este cliente ainda não possui contratos."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customerQuery.data.contracts.map((contract) => {
                  const isActive = contract.status === 'ACTIVE';

                  return (
                    <div
                      key={contract.id}
                      className={cn(
                        'rounded-lg border border-border/80 bg-background p-4 shadow-sm transition-shadow hover:shadow-card',
                        !isActive && 'opacity-75',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{contract.code}</p>
                        <StatusBadge
                          label={getContractStatusLabel(contract.status)}
                          variant={getContractStatusVariant(contract.status)}
                        />
                      </div>
                      {contract.totalValue ? (
                        <p className="mt-2 text-sm tabular-nums text-neutral">
                          {formatCurrencyFromDecimalString(contract.totalValue)}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Histórico de pagamentos"
            description="Faturas do cliente ordenadas por vencimento."
            contentClassName="p-0"
          >
            {customerQuery.data.paymentHistory.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Sem faturas"
                  description="Nenhuma fatura registrada para este cliente."
                />
              </div>
            ) : (
              <TableContainer flush>
                <Table className="min-w-[720px]">
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Contrato</TableHeaderCell>
                      <TableHeaderCell>Número</TableHeaderCell>
                      <TableHeaderCell>Vencimento</TableHeaderCell>
                      <TableHeaderCell align="right">Valor</TableHeaderCell>
                      <TableHeaderCell align="right">Pago</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {customerQuery.data.paymentHistory.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className={cn(invoice.isOverdue && 'bg-danger/5')}
                      >
                        <TableCell>{invoice.contractCode}</TableCell>
                        <TableCell className="text-neutral">
                          {invoice.invoiceNumber ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              invoice.isOverdue && 'font-medium text-danger',
                            )}
                          >
                            {formatDatePtBR(invoice.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell
                          numeric
                          className={cn(invoice.isOverdue && 'font-semibold text-danger')}
                        >
                          {formatCurrencyFromDecimalString(invoice.amount)}
                        </TableCell>
                        <TableCell numeric>
                          {formatCurrencyFromDecimalString(invoice.paidAmount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={getInvoiceStatusLabel(invoice.status)}
                            variant={
                              invoice.isOverdue
                                ? 'danger'
                                : getInvoiceStatusVariant(invoice.status)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}
