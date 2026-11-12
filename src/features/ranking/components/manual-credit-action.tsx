import * as Dialog from '@radix-ui/react-dialog';
import { HandCoins, X } from 'lucide-react';
import { useState } from 'react';
import { SectionCard } from '@/components/data-display/section-card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useManualCredit } from '@/features/ranking/hooks/use-manual-credit';
import { useUsers } from '@/features/users/hooks/use-users';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

export const MANUAL_CREDIT_MIN_REASON = 10;

type ManualCreditActionProps = {
  caseId: string;
  customerName: string;
};

// Na página do caso (supervisão/admin), quando o cliente PAGOU mas não houve
// contato registrado: a supervisão escolhe o atendente que recebe a receita.
export function ManualCreditAction({
  caseId,
  customerName,
}: ManualCreditActionProps) {
  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [reason, setReason] = useState('');
  const agentsQuery = useUsers({
    status: 'ACTIVE',
    role: 'COLLECTION_AGENT',
    limit: 100,
    enabled: open,
  });
  const mutation = useManualCredit(caseId);

  const agents = agentsQuery.data?.items ?? [];
  const reasonOk = reason.trim().length >= MANUAL_CREDIT_MIN_REASON;
  const canSubmit = Boolean(agentId) && reasonOk && !mutation.isPending;

  function reset() {
    setAgentId('');
    setReason('');
    mutation.reset();
  }

  async function handleConfirm() {
    try {
      await mutation.mutateAsync({
        assignedUserId: agentId,
        reason: reason.trim(),
      });
      toast.success('Receita creditada ao atendente.');
      setOpen(false);
      reset();
    } catch {
      return;
    }
  }

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
        ? 'Não foi possível creditar a receita.'
        : null;

  return (
    <SectionCard
      title="Creditar receita"
      description="Este cliente pagou, mas não há contato registrado. Se o atendente fechou por ligação e não deu tempo de registrar, credite a receita a ele."
    >
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
        }}
      >
        <HandCoins className="h-4 w-4" aria-hidden="true" />
        Creditar a um atendente
      </Button>

      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-modal data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-lg font-bold">
                  Creditar receita a um atendente
                </Dialog.Title>
                <Dialog.Description className="text-sm text-neutral">
                  O pagamento de {customerName} já foi confirmado no ERP. A
                  receita passa a contar para o atendente escolhido, no mês do
                  pagamento, e fica registrada na Auditoria.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fechar"
                  className="rounded-md p-1.5 text-neutral hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-neutral">
                  Atendente
                </span>
                <Select
                  value={agentId}
                  disabled={agentsQuery.isLoading || mutation.isPending}
                  onChange={(event) => {
                    setAgentId(event.target.value);
                  }}
                  aria-label="Atendente que recebe o crédito"
                >
                  <option value="">Selecione o atendente</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-neutral">
                  Motivo (obrigatório)
                </span>
                <Textarea
                  value={reason}
                  maxLength={500}
                  disabled={mutation.isPending}
                  placeholder="Ex.: atendente fechou a negociação por ligação e esqueceu de registrar o contato"
                  onChange={(event) => {
                    setReason(event.target.value);
                  }}
                  aria-label="Motivo do crédito"
                />
                <span className="block text-xs text-neutral">
                  {reasonOk
                    ? 'Fica na Auditoria e na conferência do crédito.'
                    : `Escreva ao menos ${MANUAL_CREDIT_MIN_REASON} caracteres.`}
                </span>
              </label>

              {errorMessage ? (
                <p className="text-sm text-danger" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancelar</Button>
                </Dialog.Close>
                <Button
                  disabled={!canSubmit}
                  onClick={() => {
                    void handleConfirm();
                  }}
                >
                  {mutation.isPending ? 'Creditando...' : 'Creditar receita'}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </SectionCard>
  );
}
