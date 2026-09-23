import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

type CancellationAgentOption = {
  id: string;
  name: string;
};

type CancellationReasonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  agents: CancellationAgentOption[];
  agentsLoading: boolean;
  /** Deve lançar em caso de erro para manter o diálogo aberto. */
  onConfirm: (
    reason: string,
    notes: string | undefined,
    assignedUserId: string,
  ) => Promise<void>;
};

export function CancellationReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  agents,
  agentsLoading,
  onConfirm,
}: CancellationReasonDialogProps) {
  const fieldId = useId();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setReason('');
    setNotes('');
    setAssigneeId('');
    setValidationError(null);
    setErrorMessage(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();

    if (!assigneeId) {
      setValidationError('Selecione o atendente do cancelamento.');
      return;
    }

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
      await onConfirm(
        trimmedReason,
        notes.trim() ? notes.trim() : undefined,
        assigneeId,
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível encaminhar para cancelamento.',
      );
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
          <AlertDialog.Title className="text-lg font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-neutral">
            {description}
          </AlertDialog.Description>

          <div className="mt-4 space-y-4">
            <Field
              label="Atendente do cancelamento"
              htmlFor={`assignee-${fieldId}`}
            >
              <select
                id={`assignee-${fieldId}`}
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                disabled={agentsLoading || isPending}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {agentsLoading
                    ? 'Carregando atendentes...'
                    : 'Selecione o atendente...'}
                </option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Motivo" htmlFor={`reason-${fieldId}`}>
              <Textarea
                id={`reason-${fieldId}`}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>

            <Field label="Observação" htmlFor={`notes-${fieldId}`}>
              <Textarea
                id={`notes-${fieldId}`}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
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
                  Falha ao encaminhar
                </p>
                <p className="mt-1 text-sm text-neutral">{errorMessage}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={isPending}>
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              variant="danger"
              disabled={isPending}
              onClick={() => {
                void handleConfirm();
              }}
            >
              {isPending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
