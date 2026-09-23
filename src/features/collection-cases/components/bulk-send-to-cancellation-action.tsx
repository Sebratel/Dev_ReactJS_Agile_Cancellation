import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CancellationReasonDialog } from '@/features/collection-cases/components/cancellation-reason-dialog';
import { useBulkSendToCancellation } from '@/features/collection-cases/hooks/use-bulk-send-to-cancellation';
import { useCancellationAgents } from '@/features/cancellations/hooks/use-cancellation-agents';
import { toast } from '@/lib/toast';

type BulkSendToCancellationActionProps = {
  caseIds: string[];
  onFinished: () => void;
};

function pluralCases(count: number) {
  return count === 1 ? 'caso' : 'casos';
}

// Encaminha vários casos selecionados ao cancelamento de uma vez, com um único
// motivo aplicado a todos. Só aparece na barra de ações em lote da supervisão.
export function BulkSendToCancellationAction({
  caseIds,
  onFinished,
}: BulkSendToCancellationActionProps) {
  const [open, setOpen] = useState(false);
  const mutation = useBulkSendToCancellation();
  const agentsQuery = useCancellationAgents(open);
  const agents = agentsQuery.data?.items ?? [];
  const count = caseIds.length;

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="shrink-0 whitespace-nowrap"
        disabled={count === 0}
        onClick={() => setOpen(true)}
      >
        Encaminhar p/ cancelamento
      </Button>

      <CancellationReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Encaminhar selecionados para cancelamento"
        description={`${count} ${pluralCases(count)} ${count === 1 ? 'será encaminhado' : 'serão encaminhados'} ao cancelamento. Informe o motivo (aplicado a todos).`}
        confirmLabel={`Encaminhar ${count}`}
        pendingLabel="Encaminhando..."
        isPending={mutation.isPending}
        agents={agents}
        agentsLoading={agentsQuery.isLoading}
        onConfirm={async (reason, notes, assignedUserId) => {
          const result = await mutation.mutateAsync({
            caseIds,
            reason,
            notes,
            assignedUserId,
          });

          if (result.sent === 0) {
            toast.error(
              `Nenhum caso pôde ser encaminhado (${result.skipped.length} ignorado(s): já em cancelamento ou status inválido).`,
            );
            return;
          }

          if (result.skipped.length > 0) {
            toast.success(
              `${result.sent} ${pluralCases(result.sent)} encaminhado(s); ${result.skipped.length} ignorado(s) (já em cancelamento ou status inválido).`,
            );
          } else {
            toast.success(
              `${result.sent} ${pluralCases(result.sent)} encaminhado(s) para cancelamento.`,
            );
          }

          onFinished();
        }}
      />
    </>
  );
}
