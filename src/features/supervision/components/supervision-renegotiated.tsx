import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ExternalLink,
  History,
  RefreshCw,
  Repeat,
  Wallet,
} from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import {
  getCollectionStatusLabel,
  getCollectionStatusVariant,
} from '@/features/collection-cases/utils/collection-case-labels';
import { useRenegotiationDetail } from '@/features/collection-cases/hooks/use-renegotiation-detail';
import {
  type RenegotiatedHistoryItem,
  type RenegotiatedHistoryResponse,
  type RenegotiationTitle,
} from '@/features/collection-cases/types/collection-cases-api.types';
import { cn } from '@/lib/utils';
import {
  formatCurrencyFromDecimalString,
  formatDateOnlyPtBR,
  formatInteger,
} from '@/utils/formatters';

type SupervisionRenegotiatedProps = {
  data: RenegotiatedHistoryResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export function SupervisionRenegotiated({
  data,
  isLoading,
  isError,
  onRetry,
}: SupervisionRenegotiatedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar os renegociados"
        description="Não foi possível conectar ao servidor. Tente novamente."
        retryLabel="Tentar novamente"
        onRetry={onRetry}
      />
    );
  }

  const summary = data?.summary;
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Clientes renegociados"
          value={formatInteger(summary?.totalCases ?? 0)}
          description="já renegociaram ao menos uma vez"
          icon={Repeat}
          variant="neutral"
          density="compact"
          loading={isLoading}
        />
        <MetricCard
          title="Total de renegociações"
          value={formatInteger(summary?.totalRenegotiations ?? 0)}
          description="somando todas as vezes"
          icon={History}
          variant="neutral"
          density="compact"
          loading={isLoading}
        />
        <MetricCard
          title="Com renegociação em aberto"
          value={formatInteger(summary?.currentlyRenegotiated ?? 0)}
          description="renegociaram e não quitaram"
          icon={RefreshCw}
          variant="warning"
          density="compact"
          loading={isLoading}
        />
        <MetricCard
          title="Saldo renegociado em aberto"
          value={formatCurrencyFromDecimalString(
            summary?.openRenegotiationTotal ?? '0.00',
          )}
          description="renegociação ainda não paga"
          icon={Wallet}
          variant="warning"
          density="compact"
          loading={isLoading}
        />
      </div>

      <SectionCard
        title="Clientes que renegociaram"
        description="Histórico de renegociações do Elleven (quem renegociou e quando). Clique para ver os detalhes do caso."
        contentClassName="p-0"
      >
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={6} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nenhuma renegociação registrada"
            description="Quando um cliente renegociar uma fatura no ERP, ele aparece aqui."
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Contrato</TableHeaderCell>
                  <TableHeaderCell className="text-center">
                    Renegociações
                  </TableHeaderCell>
                  <TableHeaderCell>Última renegociação</TableHeaderCell>
                  <TableHeaderCell>Status atual</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Renegociação em aberto
                  </TableHeaderCell>
                  <TableHeaderCell className="w-10" aria-label="Abrir" />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const expanded = expandedId === item.caseId;
                  return (
                    <Fragment key={item.caseId}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedId(expanded ? null : item.caseId)
                        }
                      >
                        <TableCell>
                          <Link
                            to={`/supervisao/${item.caseId}`}
                            onClick={(event) => event.stopPropagation()}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {item.customerName}
                          </Link>
                          {item.customerDocument ? (
                            <div className="text-xs text-neutral">
                              {item.customerDocument}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.contractCode ?? '—'}
                          </div>
                          <div className="text-xs text-neutral">
                            {item.assignedToName ?? 'Sem responsável'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              item.renegotiationCount > 1
                                ? 'inline-flex min-w-7 items-center justify-center rounded-full bg-warning/15 px-2 py-0.5 text-sm font-semibold tabular-nums text-warning'
                                : 'text-sm tabular-nums'
                            }
                          >
                            {formatInteger(item.renegotiationCount)}×
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateOnlyPtBR(item.lastRenegotiatedAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={getCollectionStatusLabel(item.currentStatus)}
                            variant={getCollectionStatusVariant(
                              item.currentStatus,
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {item.isCurrentlyRenegotiated ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
                              <span className="font-semibold text-warning">
                                {formatCurrencyFromDecimalString(
                                  item.openRenegotiationAmount,
                                )}
                              </span>
                            </span>
                          ) : (
                            <span className="text-neutral">quitada</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-neutral transition-transform',
                              expanded && 'rotate-180',
                            )}
                            aria-hidden="true"
                          />
                        </TableCell>
                      </TableRow>
                      {expanded ? (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-0">
                            <RenegotiationDetailPanel item={item} />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
    </div>
  );
}

function TitleList({
  titles,
  showPaid = false,
}: {
  titles: RenegotiationTitle[];
  showPaid?: boolean;
}) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {titles.map((title, index) => (
        <div
          key={`${title.invoiceNumber ?? 'title'}-${index}`}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              {title.invoiceNumber ?? 'Título'}
            </div>
            <div className="truncate text-xs text-neutral">
              {title.nature ?? '—'}
              {title.expiration
                ? ` · venc. ${formatDateOnlyPtBR(title.expiration)}`
                : ''}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-semibold tabular-nums">
              {formatCurrencyFromDecimalString(title.balance)}
            </div>
            {showPaid && title.paid ? (
              <div className="text-xs text-success">pago</div>
            ) : (
              <div className="text-xs text-neutral">
                de {formatCurrencyFromDecimalString(title.titleAmount)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RenegotiationDetailPanel({
  item,
}: {
  item: RenegotiatedHistoryItem;
}) {
  const query = useRenegotiationDetail(item.contractExternalId);

  if (!item.contractExternalId) {
    return (
      <p className="px-4 py-3 text-sm text-neutral">
        Contrato sem identificador no ERP para buscar o detalhe.
      </p>
    );
  }

  if (query.isLoading) {
    return (
      <p className="px-4 py-3 text-sm text-neutral">
        Buscando detalhe da renegociação no ERP…
      </p>
    );
  }

  if (query.isError || !query.data?.available) {
    return (
      <p className="px-4 py-3 text-sm text-neutral">
        Não foi possível buscar o detalhe no ERP agora. Tente novamente em
        instantes.
      </p>
    );
  }

  const { renegotiatedTitles, openTitles, openBalanceTotal } = query.data;

  return (
    <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Títulos renegociados</span>
          <span className="text-xs text-neutral">
            {renegotiatedTitles.length}{' '}
            {renegotiatedTitles.length === 1 ? 'título' : 'títulos'}
          </span>
        </div>
        {renegotiatedTitles.length > 0 ? (
          <TitleList titles={renegotiatedTitles} showPaid />
        ) : (
          <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-neutral">
            Nenhum título marcado como renegociado no ERP.
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Em aberto hoje</span>
          <span className="text-sm font-semibold tabular-nums text-warning">
            {formatCurrencyFromDecimalString(openBalanceTotal)}
          </span>
        </div>
        {openTitles.length > 0 ? (
          <TitleList titles={openTitles} />
        ) : (
          <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-neutral">
            Sem saldo em aberto no ERP.
          </p>
        )}
        <Link
          to={`/supervisao/${item.caseId}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Abrir caso completo
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
