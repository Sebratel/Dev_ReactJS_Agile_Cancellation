import { RecoveryAuditPopup } from '@/features/ranking/components/recovery-audit-popup';
import { useRecoveryAudit } from '@/features/ranking/hooks/use-recovery-audit';
import { type RecoveryRankingPeriod } from '@/features/ranking/types/ranking-api.types';

type RecoveryAuditDialogProps = {
  agent: { userId: string; name: string } | null;
  period: RecoveryRankingPeriod;
  onClose: () => void;
};

// Popup central da conferência do crédito de um atendente (Ranking).
export function RecoveryAuditDialog({
  agent,
  period,
  onClose,
}: RecoveryAuditDialogProps) {
  const query = useRecoveryAudit(agent?.userId ?? null, period);
  const data = query.data;

  return (
    <RecoveryAuditPopup
      open={agent !== null}
      onClose={onClose}
      title={`Conferência do crédito · ${agent?.name ?? ''}`}
      description="Como cada valor chegou ao ranking: contato da atendente, pagamento confirmado no ERP e as verificações feitas."
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => {
        void query.refetch();
      }}
      erpAvailable={data?.erpAvailable ?? true}
      cases={data?.cases ?? []}
      summary={
        data
          ? {
              totalAmount: data.totalAmount,
              verifiedCases: data.verifiedCases,
            }
          : null
      }
    />
  );
}
