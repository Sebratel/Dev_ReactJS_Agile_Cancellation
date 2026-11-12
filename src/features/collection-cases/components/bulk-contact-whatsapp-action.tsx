import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBulkContactWhatsApp } from '@/features/collection-cases/hooks/use-bulk-contact-whatsapp';
import { useBulkContactWhatsAppJob } from '@/features/collection-cases/hooks/use-bulk-contact-whatsapp-job';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

export type BulkCaseInfo = {
  id: string;
  name: string;
  phone: string | null;
};

type BulkContactWhatsAppActionProps = {
  caseIds: string[];
  cases?: BulkCaseInfo[];
  onFinished: () => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Não foi possível iniciar o envio em lote.';
}

export function BulkContactWhatsAppAction({
  caseIds,
  cases,
  onFinished,
}: BulkContactWhatsAppActionProps) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const createJob = useBulkContactWhatsApp();
  const jobQuery = useBulkContactWhatsAppJob(jobId);

  const job = jobQuery.data;
  const isFinished = job?.status === 'COMPLETED';
  const processedCount = job
    ? job.sentCount + job.skippedCount + job.failedCount
    : 0;

  const handleStart = async () => {
    try {
      const created = await createJob.mutateAsync(caseIds);
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
        variant="secondary"
        size="sm"
        className="whitespace-nowrap"
        onClick={() => setOpen(true)}
      >
        Enviar HSM em massa
      </Button>

      <AlertDialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          // Nao fecha sozinho enquanto o envio esta em andamento — evita
          // perder o acompanhamento por um clique acidental fora do dialog.
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
                    {caseIds.length}{' '}
                    {caseIds.length === 1
                      ? 'caso selecionado'
                      : 'casos selecionados'}
                  </strong>
                  . Casos sem telefone válido ou com status não elegível são
                  pulados automaticamente.
                </AlertDialog.Description>

                {cases && cases.length > 0 ? (
                  <ul className="mt-3 max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/40">
                    {cases.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {c.name}
                        </span>
                        {c.phone ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-neutral">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs text-neutral/60">
                            sem telefone
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}

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
                    : 'Enviando aos poucos, pode fechar esta janela — o envio continua em segundo plano.'}
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
                    {processedCount}/{job?.totalCount ?? caseIds.length}{' '}
                    processados
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
