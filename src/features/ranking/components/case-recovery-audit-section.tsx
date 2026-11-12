import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { SectionCard } from '@/components/data-display/section-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RecoveryAuditPopup } from '@/features/ranking/components/recovery-audit-popup';
import { useCaseRecoveryAudit } from '@/features/ranking/hooks/use-case-recovery-audit';
import { formatCurrencyFromDecimalString } from '@/utils/formatters';

type CaseRecoveryAuditSectionProps = {
  caseId: string;
  // Só faz sentido (e só a supervisão pode ver) em caso recuperado.
  enabled: boolean;
};

// Na página do caso: resumo de como esta recuperação foi creditada à atendente
// e botão que abre a linha do tempo completa (mesmo popup do Ranking).
export function CaseRecoveryAuditSection({
  caseId,
  enabled,
}: CaseRecoveryAuditSectionProps) {
  const query = useCaseRecoveryAudit(caseId, enabled);
  const [open, setOpen] = useState(false);

  if (!enabled) {
    return null;
  }

  const audit = query.data?.audit ?? null;
  const pending = audit
    ? audit.checks.filter((check) => check.status !== 'ok').length
    : 0;

  return (
    <SectionCard
      title="Conferência do crédito"
      description="Como esta recuperação foi contabilizada para a atendente."
    >
      {query.isLoading ? <Skeleton className="h-12 w-full" /> : null}

      {query.isError ? (
        <p className="text-sm text-danger">
          Não foi possível carregar a conferência.
        </p>
      ) : null}

      {query.data && !audit ? (
        <p className="text-sm text-neutral">
          Este caso não está como recuperado.
        </p>
      ) : null}

      {audit ? (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3',
            audit.verified
              ? 'bg-success/10 text-success'
              : 'bg-warning/15 text-warning',
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            {audit.verified
              ? `Receita confirmada para ${audit.assignedTo?.name ?? 'a atendente'}: ${formatCurrencyFromDecimalString(audit.recoveredAmount)}`
              : `Receita creditada: ${formatCurrencyFromDecimalString(audit.recoveredAmount)} — ${pending} etapa(s) não confirmada(s)`}
          </span>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(true);
            }}
          >
            Ver conferência
          </Button>
        </div>
      ) : null}

      <RecoveryAuditPopup
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Conferência do crédito"
        description="Contato da atendente, pagamento confirmado no ERP e as verificações feitas."
        erpAvailable={query.data?.erpAvailable ?? true}
        cases={audit ? [audit] : []}
      />
    </SectionCard>
  );
}
