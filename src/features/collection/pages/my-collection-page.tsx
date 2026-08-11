import { ArrowRight, BookUser } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard } from '@/components/data-display/metric-card';
import { PageHeader } from '@/components/data-display/page-header';
import { PageContainer } from '@/components/navigation/page-container';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
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
import { useAuth } from '@/features/auth/auth-context';
import { ContactCustomerWhatsAppAction } from '@/features/collection-cases/components/contact-customer-whatsapp-action';
import { useCollectionCases } from '@/features/collection-cases/hooks/use-collection-cases';
import {
  getCollectionStatusLabel,
  getCollectionStatusVariant,
  getPriorityLabel,
  getPriorityVariant,
  getSlaPresentation,
} from '@/features/collection-cases/utils/collection-case-labels';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

const PAGE_SIZE = 10;

export default function MyCollectionPage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [page, setPage] = useState(1);

  const casesQuery = useCollectionCases({
    page,
    limit: PAGE_SIZE,
    assignedToId: userId,
    sortBy: 'daysOverdue',
    sortDirection: 'desc',
  });

  const items = casesQuery.data?.items ?? [];
  const totalPages = Math.max(casesQuery.data?.pagination.totalPages ?? 1, 1);
  const totalCases = casesQuery.data?.pagination.total ?? items.length;
  const nextCase = page === 1 ? items[0] : undefined;

  const handleRetry = () => {
    void casesQuery.refetch();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Minha cobrança"
        description="Casos de cobrança atribuídos a você, priorizados por dias em atraso."
        actions={
          <Button onClick={handleRetry} disabled={casesQuery.isLoading}>
            Atualizar fila
          </Button>
        }
      />

      {casesQuery.isLoading ? <TableSkeleton rows={6} columns={6} /> : null}

      {casesQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar sua fila"
          description="Tente novamente ou entre em contato com o suporte."
          retryLabel="Tentar novamente"
          onRetry={handleRetry}
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length === 0 ? (
        <EmptyState
          title="Nenhum caso atribuído"
          description="Você ainda não possui casos de cobrança na sua fila."
        />
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && items.length > 0 ? (
        <>
          {nextCase ? (
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <MetricCard
                title="Casos atribuídos"
                value={formatInteger(totalCases)}
                description="Total na sua fila de cobrança"
                icon={BookUser}
                density="compact"
              />
              <div className="flex flex-col justify-between gap-3 rounded-2xl border-l-4 border-l-primary bg-card p-4 shadow-card sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral/80">
                    Próximo a tratar
                  </p>
                  <p className="mt-1 truncate text-base font-semibold">
                    {nextCase.customerName}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral">
                    {formatInteger(nextCase.daysOverdue)} dias em atraso ·{' '}
                    {formatCurrencyFromDecimalString(
                      nextCase.outstandingAmount,
                    )}{' '}
                    em aberto
                  </p>
                </div>
                <Link
                  to={`/minha-cobranca/${nextCase.id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-primary/90"
                >
                  Abrir caso
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : null}

          <TableContainer>
            <Table className="min-w-[760px]">
              <TableHead>
                <tr>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Contrato</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Prioridade</TableHeaderCell>
                  <TableHeaderCell align="right">
                    Dias em atraso
                  </TableHeaderCell>
                  <TableHeaderCell align="right">
                    Valor em aberto
                  </TableHeaderCell>
                  <TableHeaderCell>SLA</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const sla = getSlaPresentation(item.slaDueAt);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/minha-cobranca/${item.id}`}
                            className="min-w-0 text-primary hover:underline"
                          >
                            {item.customerName}
                          </Link>
                          <ContactCustomerWhatsAppAction
                            caseId={item.id}
                            customerName={item.customerName}
                            customerPhone={item.customerPhone}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral">
                        {item.contractCode}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={getCollectionStatusLabel(item.status)}
                          variant={getCollectionStatusVariant(item.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={getPriorityLabel(item.priority)}
                          variant={getPriorityVariant(item.priority)}
                        />
                      </TableCell>
                      <TableCell numeric>
                        {formatInteger(item.daysOverdue)}
                      </TableCell>
                      <TableCell numeric className="font-medium">
                        {formatCurrencyFromDecimalString(
                          item.outstandingAmount,
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={sla.label} variant={sla.variant} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </PageContainer>
  );
}
