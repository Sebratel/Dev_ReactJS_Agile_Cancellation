import { SectionCard } from '@/components/data-display/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import { RecoveryAuditCaseCard } from '@/features/ranking/components/recovery-audit-case-card';
import { useCaseRecoveryAudit } from '@/features/ranking/hooks/use-case-recovery-audit';

type CaseRecoveryAuditSectionProps = {
  caseId: string;
  // Só faz sentido (e só a supervisão pode ver) em caso recuperado.
  enabled: boolean;
};

// Na página do caso: como esta recuperação foi creditada à atendente (pagamento
// no ERP, contatos e verificações). Mesmo conteúdo da conferência do Ranking.
export function CaseRecoveryAuditSection({
  caseId,
  enabled,
}: CaseRecoveryAuditSectionProps) {
  const query = useCaseRecoveryAudit(caseId, enabled);

  if (!enabled) {
    return null;
  }

  return (
    <SectionCard
      title="Conferência do crédito"
      description="Como esta recuperação foi contabilizada para a atendente: pagamento no ERP, contatos e verificações."
    >
      {query.isLoading ? <Skeleton className="h-40 w-full" /> : null}

      {query.isError ? (
        <p className="text-sm text-danger">
          Não foi possível carregar a conferência.
        </p>
      ) : null}

      {query.data && !query.data.erpAvailable ? (
        <p className="mb-3 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
          O ERP não respondeu agora: o pagamento não pôde ser reconferido.
        </p>
      ) : null}

      {query.data?.audit ? (
        <RecoveryAuditCaseCard item={query.data.audit} />
      ) : query.data ? (
        <p className="text-sm text-neutral">
          Este caso não está como recuperado.
        </p>
      ) : null}
    </SectionCard>
  );
}
