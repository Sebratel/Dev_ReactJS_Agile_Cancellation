import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { RecoveryAuditCaseCard } from '@/features/ranking/components/recovery-audit-case-card';
import { useRecoveryAudit } from '@/features/ranking/hooks/use-recovery-audit';
import { type RecoveryRankingPeriod } from '@/features/ranking/types/ranking-api.types';
import {
  formatCurrencyFromDecimalString,
  formatInteger,
} from '@/utils/formatters';

type RecoveryAuditDrawerProps = {
  agent: { userId: string; name: string } | null;
  period: RecoveryRankingPeriod;
  onClose: () => void;
};

export function RecoveryAuditDrawer({
  agent,
  period,
  onClose,
}: RecoveryAuditDrawerProps) {
  const query = useRecoveryAudit(agent?.userId ?? null, period);
  const data = query.data;

  return (
    <Dialog.Root
      open={agent !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-background shadow-modal data-[state=open]:animate-fade-in">
          <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold">
                Conferência do crédito · {agent?.name}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-neutral">
                Como cada valor chegou ao ranking: pagamento confirmado no ERP,
                contato da atendente antes do pagamento e as verificações
                feitas.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar conferência"
                className="rounded-md p-1.5 text-neutral hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {query.isLoading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            ) : null}

            {query.isError ? (
              <ErrorState
                title="Não foi possível carregar a conferência"
                description="Tente novamente em instantes."
                retryLabel="Tentar novamente"
                onRetry={() => {
                  void query.refetch();
                }}
              />
            ) : null}

            {data ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/55 px-3 py-2.5">
                    <p className="text-xs text-neutral">Recuperações</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatInteger(data.cases.length)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/55 px-3 py-2.5">
                    <p className="text-xs text-neutral">Valor creditado</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatCurrencyFromDecimalString(data.totalAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-success/10 px-3 py-2.5">
                    <p className="text-xs text-success">Verificadas</p>
                    <p className="text-lg font-bold tabular-nums text-success">
                      {formatInteger(data.verifiedCases)} de{' '}
                      {formatInteger(data.cases.length)}
                    </p>
                  </div>
                </div>

                {!data.erpAvailable ? (
                  <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
                    O ERP não respondeu agora: o pagamento não pôde ser
                    reconferido. Tente novamente mais tarde.
                  </p>
                ) : null}

                {data.cases.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral">
                    Nenhuma recuperação neste período.
                  </p>
                ) : (
                  data.cases.map((item) => (
                    <RecoveryAuditCaseCard key={item.caseId} item={item} />
                  ))
                )}
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
