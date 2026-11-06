import { useState } from 'react';
import { Forward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CancellationReasonDialog } from '@/features/collection-cases/components/cancellation-reason-dialog';
import { useSendCaseToCancellation } from '@/features/collection-cases/hooks/use-send-case-to-cancellation';
import { useCancellationAgents } from '@/features/cancellations/hooks/use-cancellation-agents';
import { toast } from '@/lib/toast';

type SendToCancellationRowActionProps = {
  caseId: string;
  customerName: string;
  className?: string;
  // Só o ícone (com tooltip e rótulo acessível), para linhas de tabela densas.
  compact?: boolean;
};

// Ação compacta para encaminhar um caso ao cancelamento direto da lista da
// supervisão, sem abrir o detalhe. Reusa o mesmo diálogo de motivo.
export function SendToCancellationRowAction({
  caseId,
  customerName,
  className,
  compact = false,
}: SendToCancellationRowActionProps) {
  const [open, setOpen] = useState(false);
  const mutation = useSendCaseToCancellation(caseId);
  const agentsQuery = useCancellationAgents(open);
  const agents = agentsQuery.data?.items ?? [];

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
        title={compact ? 'Encaminhar ao cancelamento' : undefined}
        aria-label={
          compact ? `Encaminhar ${customerName} ao cancelamento` : undefined
        }
      >
        {compact ? (
          <Forward className="h-4 w-4" aria-hidden="true" />
        ) : (
          'Cancelamento'
        )}
      </Button>

      <CancellationReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Encaminhar para cancelamento"
        description={`Inicia o processo de cancelamento do contrato de ${customerName}.`}
        confirmLabel="Confirmar encaminhamento"
        pendingLabel="Encaminhando..."
        isPending={mutation.isPending}
        agents={agents}
        agentsLoading={agentsQuery.isLoading}
        onConfirm={async (reason, notes, assignedUserId) => {
          await mutation.mutateAsync({ reason, notes, assignedUserId });
          toast.success('Caso encaminhado para cancelamento.');
        }}
      />
    </>
  );
}
