import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CancellationReasonDialog } from '@/features/collection-cases/components/cancellation-reason-dialog';
import { useSendCaseToCancellation } from '@/features/collection-cases/hooks/use-send-case-to-cancellation';
import { useCancellationAgents } from '@/features/cancellations/hooks/use-cancellation-agents';
import { toast } from '@/lib/toast';

type SendToCancellationActionProps = {
  caseId: string;
};

export function SendToCancellationAction({
  caseId,
}: SendToCancellationActionProps) {
  const mutation = useSendCaseToCancellation(caseId);
  const [open, setOpen] = useState(false);
  const agentsQuery = useCancellationAgents(open);
  const agents = agentsQuery.data?.items ?? [];

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => setOpen(true)}
      >
        Encaminhar para cancelamento
      </Button>

      <CancellationReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Encaminhar para cancelamento"
        description="Escolha o atendente do cancelamento e informe o motivo. Esta ação inicia o processo de cancelamento do contrato vinculado ao caso."
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
    </div>
  );
}
