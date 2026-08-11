import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { useIntegrationEvents, useIntegrationEventsSummary } from '@/features/integrations/hooks/use-integration-events';
import { type IntegrationEventStatus } from '@/features/integrations/types/integration-events-api.types';
import { type StatusVariant } from '@/types/ui';
import { formatDateTimePtBR, formatInteger } from '@/utils/formatters';

const STATUS_LABELS: Record<IntegrationEventStatus, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
  RETRYING: 'Tentando novamente',
  DISCARDED: 'Descartado',
};

const STATUS_VARIANTS: Record<IntegrationEventStatus, StatusVariant> = {
  PENDING: 'neutral',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  RETRYING: 'warning',
  DISCARDED: 'neutral',
};

export function IntegrationEventsPanel() {
  const [status, setStatus] = useState<IntegrationEventStatus | ''>('');

  const summaryQuery = useIntegrationEventsSummary();
  const listQuery = useIntegrationEvents({
    status: status || undefined,
    limit: 15,
  });

  const summary = summaryQuery.data;
  const items = listQuery.data?.items ?? [];

  const handleRetry = () => { void listQuery.refetch(); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 card-stagger">
        <MetricCard
          title="Pendentes"
          value={formatInteger(summary?.pending ?? 0)}
          description="Aguardando processamento"
          icon={Clock}
          variant="neutral"
          loading={summaryQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Processando"
          value={formatInteger(summary?.processing ?? 0)}
          description="Em execução agora"
          icon={RefreshCw}
          variant="warning"
          loading={summaryQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Falhas"
          value={formatInteger(summary?.failed ?? 0)}
          description="Requerem atenção"
          icon={AlertCircle}
          variant={summary && summary.failed > 0 ? 'danger' : 'neutral'}
          loading={summaryQuery.isLoading}
          density="compact"
        />
        <MetricCard
          title="Concluídos hoje"
          value={formatInteger(summary?.completedToday ?? 0)}
          description="Processados com sucesso"
          icon={CheckCircle2}
          variant="success"
          loading={summaryQuery.isLoading}
          density="compact"
        />
      </div>

      <SectionCard
        title="Eventos de integração"
        description="Histórico de eventos recebidos via webhook e sincronização com o ERP."
        contentClassName="p-0"
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as IntegrationEventStatus | '')}
              className="h-8 text-xs"
            >
              <option value="">Todos os status</option>
              {(Object.keys(STATUS_LABELS) as IntegrationEventStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <Button variant="secondary" size="sm" onClick={handleRetry} disabled={listQuery.isLoading}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      >
        {listQuery.isLoading ? <TableSkeleton rows={5} columns={5} /> : null}

        {listQuery.isError ? (
          <ErrorState
            title="Não foi possível carregar os eventos"
            description="Verifique a conexão com o servidor e tente novamente."
            retryLabel="Tentar novamente"
            onRetry={handleRetry}
          />
        ) : null}

        {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
          <EmptyState
            title="Nenhum evento encontrado"
            description="Não há eventos de integração registrados para o filtro selecionado."
          />
        ) : null}

        {!listQuery.isLoading && !listQuery.isError && items.length > 0 ? (
          <TableContainer flush className="max-h-[420px] overflow-y-auto">
            <Table className="min-w-[720px]">
              <TableHead sticky>
                <tr>
                  <TableHeaderCell>Origem</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Erro</TableHeaderCell>
                  <TableHeaderCell>Recebido em</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.source}</TableCell>
                    <TableCell className="text-neutral">{event.eventType}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={STATUS_LABELS[event.status]}
                        variant={STATUS_VARIANTS[event.status]}
                      />
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-danger">
                      {event.errorMessage ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums text-neutral">
                      {formatDateTimePtBR(event.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </SectionCard>
    </div>
  );
}
