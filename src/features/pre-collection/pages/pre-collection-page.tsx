import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/navigation/page-container';
import { PageHeader } from '@/components/data-display/page-header';
import { SectionCard } from '@/components/data-display/section-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/data-display/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { usePreCollection } from '@/features/pre-collection/hooks/use-pre-collection';
import { type PreCollectionItem } from '@/features/pre-collection/types/pre-collection-api.types';
import {
  formatCurrencyFromDecimalString,
  formatDateOnlyPtBR,
  formatDateTimePtBR,
  formatInteger,
} from '@/utils/formatters';

const WINDOW_OPTIONS = [3, 7, 15] as const;

function daysBadge(days: number) {
  if (days <= 0) return { label: 'vence hoje', variant: 'danger' as const };
  if (days <= 2) return { label: `em ${days} ${days === 1 ? 'dia' : 'dias'}`, variant: 'danger' as const };
  if (days <= 5) return { label: `em ${days} dias`, variant: 'warning' as const };
  return { label: `em ${days} dias`, variant: 'neutral' as const };
}

function matchesSearch(item: PreCollectionItem, term: string) {
  const haystack = [
    item.customerName,
    item.customerDocument ?? '',
    item.contractCode,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export default function PreCollectionPage() {
  const [daysWindow, setDaysWindow] = useState<number>(7);
  const [search, setSearch] = useState('');

  const query = usePreCollection(daysWindow);
  const data = query.data;

  const items = useMemo(() => {
    const all = data?.items ?? [];
    const term = search.trim().toLowerCase();
    return term ? all.filter((item) => matchesSearch(item, term)) : all;
  }, [data, search]);

  const totalOpen = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.totalOpenAmount), 0),
    [items],
  );

  const isRefreshing = data?.refreshing ?? false;

  return (
    <PageContainer>
      <PageHeader
        title="Prestes a vencer a 2ª"
        description="Clientes com 1 mensalidade vencida e a 2ª próxima de vencer — visão preventiva, direto do ERP. Não são casos de cobrança."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              void query.refetch();
            }}
            disabled={query.isFetching}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <SectionCard
        title="Janela de antecedência"
        description="Quantos dias antes do 2º vencimento incluir na lista."
      >
        <div className="flex flex-wrap items-center gap-2">
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDaysWindow(option)}
              className={
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ' +
                (daysWindow === option
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-neutral hover:text-foreground')
              }
            >
              {option} dias
            </button>
          ))}
          <span className="ml-auto text-xs text-neutral">
            {isRefreshing
              ? 'Atualizando dados do ERP…'
              : data?.generatedAt
                ? `Atualizado ${formatDateTimePtBR(data.generatedAt)}`
                : ''}
          </span>
        </div>
      </SectionCard>

      {query.isLoading ? <TableSkeleton rows={6} columns={5} /> : null}

      {query.isError ? (
        <ErrorState
          title="Não foi possível carregar a lista"
          description="Não foi possível conectar ao servidor. Tente novamente."
          retryLabel="Tentar novamente"
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : null}

      {!query.isLoading && !query.isError && isRefreshing && items.length === 0 ? (
        <EmptyState
          title="Montando a lista…"
          description="O primeiro carregamento consulta o ERP e pode levar alguns segundos. Atualiza sozinho."
        />
      ) : null}

      {!query.isLoading &&
      !query.isError &&
      !isRefreshing &&
      (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhum cliente nesta janela"
          description="Não há clientes com 1 vencida e a 2ª prestes a vencer no período selecionado."
        />
      ) : null}

      {!query.isLoading && !query.isError && (data?.items.length ?? 0) > 0 ? (
        <SectionCard
          title="Clientes"
          description={`${formatInteger(items.length)} ${items.length === 1 ? 'cliente' : 'clientes'} · ${formatCurrencyFromDecimalString(totalOpen.toFixed(2))} em aberto`}
          contentClassName="p-0"
        >
          <div className="border-b border-border px-4 py-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente, documento ou contrato"
              className="max-w-sm"
            />
          </div>

          <TableContainer flush className="max-h-[65vh] overflow-y-auto">
            <Table className="min-w-[820px]">
              <TableHead sticky>
                <tr>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Contrato</TableHeaderCell>
                  <TableHeaderCell>1ª vencida</TableHeaderCell>
                  <TableHeaderCell>2ª a vencer</TableHeaderCell>
                  <TableHeaderCell align="right">Em aberto</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const badge = daysBadge(item.daysUntilSecond);
                  return (
                    <TableRow key={`${item.contractCode}-${item.contractExternalId ?? ''}`}>
                      <TableCell className="font-medium">
                        <div className="min-w-0">
                          <div className="truncate">{item.customerName}</div>
                          <div className="text-xs text-neutral">
                            {item.customerDocument ?? '—'}
                            {item.customerPhone ? ` · ${item.customerPhone}` : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral">
                        {item.contractCode}
                      </TableCell>
                      <TableCell className="text-neutral">
                        <div className="tabular-nums text-foreground">
                          {formatDateOnlyPtBR(item.firstOverdueDate) ?? '—'}
                        </div>
                        <div className="text-xs">
                          {formatCurrencyFromDecimalString(item.firstOverdueAmount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="tabular-nums font-medium">
                          {formatDateOnlyPtBR(item.secondDueDate) ?? '—'}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge label={badge.label} variant={badge.variant} />
                          <span className="text-xs text-neutral">
                            {formatCurrencyFromDecimalString(item.secondDueAmount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell align="right" className="font-semibold tabular-nums">
                        {formatCurrencyFromDecimalString(item.totalOpenAmount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
