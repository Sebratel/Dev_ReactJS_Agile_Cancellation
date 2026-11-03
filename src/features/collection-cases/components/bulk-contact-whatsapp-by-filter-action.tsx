import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBulkContactWhatsAppByFilter } from '@/features/collection-cases/hooks/use-bulk-contact-whatsapp-by-filter';
import { useBulkContactWhatsAppJob } from '@/features/collection-cases/hooks/use-bulk-contact-whatsapp-job';
import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

type BulkContactWhatsAppByFilterActionProps = {
  filters: CollectionCasesListParams;
  matchCount: number;
  onFinished: () => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Não foi possível iniciar o envio em lote.';
}

export function BulkContactWhatsAppByFilterAction({
  filters,
  matchCount,
  onFinished,
}: BulkContactWhatsAppByFilterActionProps) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const createJob = useBulkContactWhatsAppByFilter();
  const jobQuery = useBulkContactWhatsAppJob(jobId);

  const job = jobQuery.data;
  const isFinished = job?.status === 'COMPLETED';
  const processedCount = job
    ? job.sentCount + job.skippedCount + job.failedCount
    : 0;

  const handleStart = async () => {
    try {
      const created = await createJob.mutateAsync(filters);
      setJobId(created.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleClose = () => {
    setOpen(false);
    setJobId(null);
    createJob.reset();
    onFinished();
  };

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="whitespace-nowrap"
        disabled={matchCount === 0}
        onClick={() => setOpen(true)}
      >
        Enviar HSM para os casos filtrados
      </Button>

      <AlertDialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && jobId && !isFinished) return;
          if (!nextOpen) handleClose();
          else setOpen(true);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
            <AlertDialog.Title className="text-lg font-semibold">
              Enviar HSM em massa
            </AlertDialog.Title>

            {!jobId ? (
              <>
                <AlertDialog.Description className="mt-2 text-sm text-neutral">
                  Isso vai disparar a mensagem HSM do WhatsApp para{' '}
                  <strong>
                    {matchCount}{' '}
                    {matchCount === 1
                      ? 'cliente que corresponde'
                      : 'clientes que correspondem'}
                  </strong>{' '}
                  aos filtros atuais. Casos com status não elegível ou sem
                  telefone válido são pulados automaticamente. O envio acontece
                  aos poucos em segundo plano — acompanhe o progresso no
                  histórico da tela.
                </AlertDialog.Description>

                <div className="mt-6 flex justify-end gap-3">
                  <AlertDialog.Cancel asChild>
                    <Button variant="secondary">Cancelar</Button>
                  </AlertDialog.Cancel>
                  <Button
                    type="button"
                    disabled={createJob.isPending}
                    onClick={() => {
                      void handleStart();
                    }}
                  >
                    {createJob.isPending ? 'Iniciando...' : 'Iniciar envio'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <AlertDialog.Description className="mt-2 text-sm text-neutral">
                  {isFinished
                    ? 'Envio concluído.'
                    : 'Enviando aos poucos, pode fechar esta janela — o envio continua em segundo plano e aparece no histórico.'}
                </AlertDialog.Description>

                <div className="mt-4 space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{
                        width: job
                          ? `${Math.min(100, (processedCount / Math.max(job.totalCount, 1)) * 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <p className="text-sm tabular-nums text-neutral">
                    {processedCount}/{job?.totalCount ?? matchCount} processados
                  </p>
                  {job ? (
                    <p className="text-xs text-neutral">
                      {job.sentCount} enviados · {job.skippedCount} pulados ·{' '}
                      {job.failedCount} falharam
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button type="button" onClick={handleClose}>
                    {isFinished ? 'Concluir' : 'Fechar'}
                  </Button>
                </div>
              </>
            )}
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
