import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
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
import { useBulkContactWhatsAppJobsList } from '@/features/collection-cases/hooks/use-bulk-contact-whatsapp-jobs-list';
import { type BulkContactWhatsAppJobResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { formatDateTimePtBR } from '@/utils/formatters';

type BulkContactWhatsAppJobsHistoryProps = {
  page: number;
  onPageChange: (page: number) => void;
};

function getStatusLabel(status: BulkContactWhatsAppJobResponse['status']) {
  if (status === 'COMPLETED') return 'Concluído';
  if (status === 'PROCESSING') return 'Em andamento';
  return 'Na fila';
}

function getStatusVariant(status: BulkContactWhatsAppJobResponse['status']) {
  if (status === 'COMPLETED') return 'success' as const;
  if (status === 'PROCESSING') return 'warning' as const;
  return 'neutral' as const;
}

function JobProgressBar({ job }: { job: BulkContactWhatsAppJobResponse }) {
  const processed = job.sentCount + job.skippedCount + job.failedCount;
  const percent = Math.min(
    100,
    Math.round((processed / Math.max(job.totalCount, 1)) * 100),
  );

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-warning transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-neutral">{percent}%</span>
    </div>
  );
}

export function BulkContactWhatsAppJobsHistory({
  page,
  onPageChange,
}: BulkContactWhatsAppJobsHistoryProps) {
  const jobsQuery = useBulkContactWhatsAppJobsList(page);
  const jobs = jobsQuery.data?.items ?? [];
  const totalPages = Math.max(jobsQuery.data?.pagination.totalPages ?? 1, 1);

  if (jobsQuery.isLoading) {
    return <TableSkeleton rows={3} columns={6} />;
  }

  if (jobsQuery.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o histórico"
        description="Não foi possível conectar ao servidor. Tente novamente."
        retryLabel="Tentar novamente"
        onRetry={() => {
          void jobsQuery.refetch();
        }}
      />
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="Nenhum envio em lote ainda"
        description="Assim que você iniciar um envio de HSM em massa, ele aparece aqui com o progresso agregado."
      />
    );
  }

  return (
    <div className="space-y-3">
      <TableContainer flush>
        <Table className="min-w-[640px]">
          <TableHead>
            <tr>
              <TableHeaderCell>Iniciado em</TableHeaderCell>
              <TableHeaderCell align="center">Status</TableHeaderCell>
              <TableHeaderCell align="center">Total</TableHeaderCell>
              <TableHeaderCell align="center">Enviados</TableHeaderCell>
              <TableHeaderCell align="center">Pulados</TableHeaderCell>
              <TableHeaderCell align="center">Falharam</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>{formatDateTimePtBR(job.createdAt)}</TableCell>
                <TableCell align="center">
                  <div className="flex flex-col items-center">
                    <StatusBadge
                      label={getStatusLabel(job.status)}
                      variant={getStatusVariant(job.status)}
                    />
                    {job.status === 'PROCESSING' ? (
                      <JobProgressBar job={job} />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell align="center" className="tabular-nums">
                  {job.totalCount}
                </TableCell>
                <TableCell align="center" className="tabular-nums text-success">
                  {job.sentCount}
                </TableCell>
                <TableCell align="center" className="tabular-nums text-neutral">
                  {job.skippedCount}
                </TableCell>
                <TableCell align="center" className="tabular-nums text-danger">
                  {job.failedCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
