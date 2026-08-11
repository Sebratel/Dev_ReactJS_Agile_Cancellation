import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCompleteCancellationStep } from '@/features/collection-cases/hooks/use-complete-cancellation-step';
import type { CollectionCaseCancellationStepSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { getCancellationStepErrorMessage } from '@/features/collection-cases/utils/cancellation-step-error-messages';
import { toast } from '@/lib/toast';

type CompleteCancellationStepActionProps = {
  caseId: string;
  cancellationId: string;
  step: CollectionCaseCancellationStepSummary;
};

export function CompleteCancellationStepAction({
  caseId,
  cancellationId,
  step,
}: CompleteCancellationStepActionProps) {
  const mutation = useCompleteCancellationStep(caseId);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [externalProtocol, setExternalProtocol] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    setErrorMessage(null);

    try {
      await mutation.mutateAsync({
        cancellationId,
        stepCode: step.stepCode,
        payload: {
          notes: notes.trim() || undefined,
          externalProtocol: externalProtocol.trim() || undefined,
          completedAt: completedAt.trim()
            ? new Date(completedAt).toISOString()
            : undefined,
        },
      });

      toast.success(`Etapa "${step.name}" concluída com sucesso.`);
      setOpen(false);
      setNotes('');
      setExternalProtocol('');
      setCompletedAt('');
    } catch (error) {
      setErrorMessage(getCancellationStepErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setErrorMessage(null);
          setOpen(true);
        }}
      >
        Concluir etapa
      </Button>

      {errorMessage && !open ? (
        <ErrorState
          title="Falha ao concluir etapa"
          description={errorMessage}
        />
      ) : null}

      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
            <AlertDialog.Title className="text-lg font-semibold text-foreground">
              Concluir etapa
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-neutral">
              Confirmar conclusão da etapa {step.name}.
            </AlertDialog.Description>

            <div className="mt-4 space-y-4">
              <Field label="Observação" htmlFor={`step-notes-${step.id}`}>
                <Textarea
                  id={`step-notes-${step.id}`}
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>

              <Field
                label="Protocolo externo (opcional)"
                htmlFor={`step-protocol-${step.id}`}
              >
                <Input
                  id={`step-protocol-${step.id}`}
                  maxLength={100}
                  value={externalProtocol}
                  onChange={(event) => setExternalProtocol(event.target.value)}
                />
              </Field>

              <Field
                label="Data de conclusão (opcional)"
                htmlFor={`step-completed-at-${step.id}`}
              >
                <Input
                  id={`step-completed-at-${step.id}`}
                  type="datetime-local"
                  value={completedAt}
                  onChange={(event) => setCompletedAt(event.target.value)}
                />
              </Field>
            </div>

            {errorMessage && open ? (
              <div className="mt-4">
                <ErrorState
                  title="Falha ao concluir etapa"
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
                {mutation.isPending ? 'Concluindo...' : 'Confirmar conclusão'}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
