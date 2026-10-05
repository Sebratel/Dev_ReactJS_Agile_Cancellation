import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useRevertCancellation } from '@/features/collection-cases/hooks/use-revert-cancellation';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

type RevertCancellationActionProps = {
  caseId: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Não foi possível reverter o cancelamento do caso.';
}

export function RevertCancellationAction({
  caseId,
}: RevertCancellationActionProps) {
  const mutation = useRevertCancellation(caseId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setValidationError('Informe como o cliente foi retido.');
      return;
    }

    if (trimmedReason.length > 500) {
      setValidationError('O motivo deve ter no máximo 500 caracteres.');
      return;
    }

    setValidationError(null);
    setErrorMessage(null);

    try {
      await mutation.mutateAsync({
        reason: trimmedReason,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      setOpen(false);
      setReason('');
      setNotes('');
      toast.success('Cancelamento revertido. O caso voltou para a cobrança.');
    } catch (error) {
      // Mantém o dialog aberto para preservar o contexto e o que foi digitado
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => {
          setErrorMessage(null);
          setOpen(true);
        }}
      >
        Reverter cancelamento
      </Button>

      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
            <AlertDialog.Title className="text-lg font-semibold">
              Reverter cancelamento
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-neutral">
              O caso sai da esteira de cancelamento e volta para a cobrança. Ele
              só será contado como recuperado quando o pagamento for confirmado
              no ERP — a reversão em si não registra receita.
            </AlertDialog.Description>

            <div className="mt-4 space-y-4">
              <Field
                label="Como o cliente foi retido"
                htmlFor={`revert-reason-${caseId}`}
              >
                <Textarea
                  id={`revert-reason-${caseId}`}
                  rows={3}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                  }}
                />
              </Field>

              <Field label="Observação" htmlFor={`revert-notes-${caseId}`}>
                <Textarea
                  id={`revert-notes-${caseId}`}
                  rows={3}
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                  }}
                />
              </Field>

              {validationError ? (
                <p className="text-sm text-danger" role="alert">
                  {validationError}
                </p>
              ) : null}

              {errorMessage ? (
                <div
                  className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3"
                  role="alert"
                >
                  <p className="text-sm font-semibold text-danger">
                    Falha ao reverter cancelamento
                  </p>
                  <p className="mt-1 text-sm text-neutral">{errorMessage}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">Cancelar</Button>
              </AlertDialog.Cancel>
              <Button
                type="button"
                variant="primary"
                disabled={mutation.isPending}
                onClick={() => {
                  void handleConfirm();
                }}
              >
                {mutation.isPending ? 'Revertendo...' : 'Confirmar reversão'}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
