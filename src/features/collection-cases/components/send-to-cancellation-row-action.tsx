import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CancellationReasonDialog } from '@/features/collection-cases/components/cancellation-reason-dialog';
import { useSendCaseToCancellation } from '@/features/collection-cases/hooks/use-send-case-to-cancellation';
import { toast } from '@/lib/toast';

type SendToCancellationRowActionProps = {
  caseId: string;
  customerName: string;
  className?: string;
};

// Ação compacta para encaminhar um caso ao cancelamento direto da lista da
// supervisão, sem abrir o detalhe. Reusa o mesmo diálogo de motivo.
export function SendToCancellationRowAction({
  caseId,
  customerName,
  className,
}: SendToCancellationRowActionProps) {
  const [open, setOpen] = useState(false);
  const mutation = useSendCaseToCancellation(caseId);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'justify-center whitespace-nowrap text-danger ring-1 ring-danger/30 hover:bg-danger/10',
          className,
        )}
        onClick={() => setOpen(true)}
      >
        Cancelamento
      </Button>

      <CancellationReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Encaminhar para cancelamento"
        description={`Inicia o processo de cancelamento do contrato de ${customerName}.`}
        confirmLabel="Confirmar encaminhamento"
        pendingLabel="Encaminhando..."
        isPending={mutation.isPending}
        onConfirm={async (reason, notes) => {
          await mutation.mutateAsync({ reason, notes });
          toast.success('Caso encaminhado para cancelamento.');
        }}
      />
    </>
  );
}
