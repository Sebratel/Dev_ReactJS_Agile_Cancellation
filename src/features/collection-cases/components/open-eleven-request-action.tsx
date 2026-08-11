import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { CancellationStepBlockedAction } from '@/features/collection-cases/components/cancellation-step-blocked-action';
import { useCreateElevenCancellationRequest } from '@/features/collection-cases/hooks/use-create-eleven-cancellation-request';
import { useElevenIntegrationStatus } from '@/features/integrations/hooks/use-eleven-integration-status';
import type { CollectionCaseCancellationStepSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { getElevenRequestErrorMessage } from '@/features/collection-cases/utils/cancellation-step-error-messages';
import { toast } from '@/lib/toast';

type OpenElevenRequestActionProps = {
  caseId: string;
  cancellationId: string;
  step: CollectionCaseCancellationStepSummary;
};

export function OpenElevenRequestAction({
  caseId,
  cancellationId,
  step,
}: OpenElevenRequestActionProps) {
  const elevenStatusQuery = useElevenIntegrationStatus();
  const mutation = useCreateElevenCancellationRequest(caseId);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnedProtocol, setReturnedProtocol] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (elevenStatusQuery.data && !elevenStatusQuery.data.available) {
      return;
    }

    setErrorMessage(null);

    try {
      const result = await mutation.mutateAsync({
        cancellationId,
        payload: {
          notes: notes.trim() || undefined,
        },
      });

      setReturnedProtocol(result.protocol);
      toast.success(`Solicitação Eleven aberta. Protocolo: ${result.protocol}`);
      setOpen(false);
      setNotes('');
    } catch (error) {
      setErrorMessage(getElevenRequestErrorMessage(error));
    }
  };

  if (elevenStatusQuery.data && !elevenStatusQuery.data.available) {
    return (
      <CancellationStepBlockedAction
        label="Abrir solicitação Eleven"
        reason={elevenStatusQuery.data.message}
      />
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => {
          setErrorMessage(null);
          setOpen(true);
        }}
      >
        Abrir solicitação Eleven
      </Button>

      {returnedProtocol ? (
        <p className="text-xs text-neutral">Protocolo: {returnedProtocol}</p>
      ) : null}

      {errorMessage && !open ? (
        <ErrorState
          title="Falha ao abrir solicitação Eleven"
          description={errorMessage}
        />
      ) : null}

      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
            <AlertDialog.Title className="text-lg font-semibold text-foreground">
              Abrir solicitação Eleven
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-neutral">
              Confirmar abertura da solicitação Eleven para a etapa {step.name}.
            </AlertDialog.Description>

            <div className="mt-4">
              <Field
                label="Observação (opcional)"
                htmlFor={`eleven-notes-${step.id}`}
              >
                <Textarea
                  id={`eleven-notes-${step.id}`}
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>
            </div>

            {errorMessage && open ? (
              <div className="mt-4">
                <ErrorState
                  title="Falha ao abrir solicitação Eleven"
                  description={errorMessage}
                />
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </AlertDialog.Cancel>
              <Button
                type="button"
                variant="primary"
                disabled={mutation.isPending}
                onClick={() => {
                  void handleConfirm();
                }}
              >
                {mutation.isPending ? 'Abrindo...' : 'Confirmar abertura'}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
