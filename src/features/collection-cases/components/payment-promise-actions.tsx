import { useState } from 'react';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useBreakPaymentPromise } from '@/features/collection-cases/hooks/use-break-payment-promise';
import { useCancelPaymentPromise } from '@/features/collection-cases/hooks/use-cancel-payment-promise';
import { useFulfillPaymentPromise } from '@/features/collection-cases/hooks/use-fulfill-payment-promise';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

type PromiseAction = 'fulfill' | 'break' | 'cancel';

type PaymentPromiseActionsProps = {
  caseId: string;
  promiseId: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Não foi possível atualizar a promessa. Tente novamente.';
}

export function PaymentPromiseActions({
  caseId,
  promiseId,
}: PaymentPromiseActionsProps) {
  const fulfillMutation = useFulfillPaymentPromise(caseId);
  const breakMutation = useBreakPaymentPromise(caseId);
  const cancelMutation = useCancelPaymentPromise(caseId);
  const [pendingAction, setPendingAction] = useState<PromiseAction | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPending =
    fulfillMutation.isPending ||
    breakMutation.isPending ||
    cancelMutation.isPending;

  const handleConfirm = async () => {
    if (!pendingAction) {
      return;
    }

    setErrorMessage(null);

    try {
      if (pendingAction === 'fulfill') {
        await fulfillMutation.mutateAsync({ promiseId });
        toast.success('Promessa marcada como cumprida.');
      }

      if (pendingAction === 'break') {
        await breakMutation.mutateAsync({ promiseId });
        toast.success('Promessa marcada como descumprida.');
      }

      if (pendingAction === 'cancel') {
        await cancelMutation.mutateAsync({ promiseId });
        toast.success('Promessa cancelada.');
      }

      setPendingAction(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPendingAction(null);
    }
  };

  const dialogConfig =
    pendingAction === 'fulfill'
      ? {
          title: 'Marcar promessa como cumprida',
          description:
            'Confirma que o cliente cumpriu o pagamento prometido para este caso?',
          confirmLabel: 'Confirmar cumprimento',
          variant: 'default' as const,
        }
      : pendingAction === 'break'
        ? {
            title: 'Marcar promessa como descumprida',
            description:
              'O cliente não cumpriu o acordo. Esta ação registra a quebra da promessa e será gravada na auditoria.',
            confirmLabel: 'Confirmar descumprimento',
            variant: 'danger' as const,
          }
        : {
            title: 'Cancelar promessa',
            description:
              'A promessa deixará de estar ativa. Use quando o acordo não deve mais ser considerado.',
            confirmLabel: 'Confirmar cancelamento',
            variant: 'default' as const,
          };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setPendingAction('fulfill');
          }}
        >
          Marcar como cumprida
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="text-danger ring-danger/30 hover:bg-danger/5"
          disabled={isPending}
          onClick={() => {
            setPendingAction('break');
          }}
        >
          Marcar como descumprida
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setPendingAction('cancel');
          }}
        >
          Cancelar promessa
        </Button>
      </div>

      {errorMessage ? (
        <ErrorState
          title="Falha ao atualizar promessa"
          description={errorMessage}
        />
      ) : null}

      <ConfirmDialog
        open={pendingAction !== null}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmLabel={dialogConfig.confirmLabel}
        variant={dialogConfig.variant}
        onConfirm={() => {
          void handleConfirm();
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
}
