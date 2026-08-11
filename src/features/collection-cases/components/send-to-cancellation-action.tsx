import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useSendCaseToCancellation } from '@/features/collection-cases/hooks/use-send-case-to-cancellation';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

type SendToCancellationActionProps = {
  caseId: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Não foi possível encaminhar o caso para cancelamento.';
}

export function SendToCancellationAction({
  caseId,
}: SendToCancellationActionProps) {
  const mutation = useSendCaseToCancellation(caseId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setValidationError('Informe o motivo do encaminhamento.');
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
      toast.success('Caso encaminhado para cancelamento.');
    } catch (error) {
      // Mantém o dialog aberto para preservar o contexto e o que foi digitado
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => {
          setErrorMessage(null);
          setOpen(true);
        }}
      >
        Encaminhar para cancelamento
      </Button>

      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
            <AlertDialog.Title className="text-lg font-semibold">
              Encaminhar para cancelamento
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-neutral">
              Informe o motivo do encaminhamento. Esta ação inicia o processo de
              cancelamento do contrato vinculado ao caso.
            </AlertDialog.Description>

            <div className="mt-4 space-y-4">
              <Field label="Motivo" htmlFor={`reason-${caseId}`}>
                <Textarea
                  id={`reason-${caseId}`}
                  rows={3}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                  }}
                />
              </Field>

              <Field label="Observação" htmlFor={`notes-${caseId}`}>
                <Textarea
                  id={`notes-${caseId}`}
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
                    Falha ao encaminhar caso
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
                variant="danger"
                disabled={mutation.isPending}
                onClick={() => {
                  void handleConfirm();
                }}
              >
                {mutation.isPending
                  ? 'Encaminhando...'
                  : 'Confirmar encaminhamento'}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
