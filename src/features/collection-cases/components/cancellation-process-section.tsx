import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { CancellationStepBlockedAction } from '@/features/collection-cases/components/cancellation-step-blocked-action';
import { CompleteCancellationStepAction } from '@/features/collection-cases/components/complete-cancellation-step-action';
import { OpenElevenRequestAction } from '@/features/collection-cases/components/open-eleven-request-action';
import type { CollectionCaseCancellationSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import {
  getCancellationStatusLabel,
  getCancellationStatusVariant,
  getCancellationStepStatusLabel,
  getCancellationStepStatusVariant,
} from '@/features/collection-cases/utils/collection-case-labels';
import {
  getCancellationStepRowClassName,
  getNextPendingCancellationStep,
  resolveCancellationStepActionState,
} from '@/features/collection-cases/utils/cancellation-step-access';
import { useAuth } from '@/features/auth/auth-context';
import { formatDatePtBR, formatDateTimePtBR } from '@/utils/formatters';

type CancellationProcessSectionProps = {
  caseId: string;
  cancellationProcess: CollectionCaseCancellationSummary;
};

function renderStepAction(input: {
  caseId: string;
  cancellationId: string;
  step: CollectionCaseCancellationSummary['steps'][number];
  actionState: ReturnType<typeof resolveCancellationStepActionState>;
}) {
  if (input.actionState.kind === 'completed') {
    return <span className="text-neutral">—</span>;
  }

  if (input.actionState.kind === 'hidden') {
    return <span className="text-neutral">—</span>;
  }

  if (input.actionState.kind === 'disabled') {
    return (
      <CancellationStepBlockedAction
        label={
          input.actionState.useElevenAction
            ? 'Abrir solicitação Eleven'
            : 'Concluir etapa'
        }
        reason={
          input.actionState.blockReason ?? 'Ação indisponível no momento.'
        }
      />
    );
  }

  if (input.actionState.useElevenAction) {
    return (
      <OpenElevenRequestAction
        caseId={input.caseId}
        cancellationId={input.cancellationId}
        step={input.step}
      />
    );
  }

  return (
    <CompleteCancellationStepAction
      caseId={input.caseId}
      cancellationId={input.cancellationId}
      step={input.step}
    />
  );
}

export function CancellationProcessSection({
  caseId,
  cancellationProcess,
}: CancellationProcessSectionProps) {
  const { session } = useAuth();
  const userRoles = session?.user.roles ?? [];
  const sortedSteps = [...cancellationProcess.steps].sort(
    (left, right) => left.stepOrder - right.stepOrder,
  );
  const nextPendingStep = getNextPendingCancellationStep(sortedSteps);

  return (
    <SectionCard
      title="Processo de cancelamento"
      description="Checklist sequencial das etapas operacionais e integração Eleven."
    >
      <dl className="mb-6 grid gap-4 text-sm md:grid-cols-3">
        <div>
          <dt className="font-medium text-neutral">Status do processo</dt>
          <dd className="mt-1">
            <StatusBadge
              label={getCancellationStatusLabel(cancellationProcess.status)}
              variant={getCancellationStatusVariant(cancellationProcess.status)}
            />
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral">Início</dt>
          <dd className="mt-1">
            {cancellationProcess.startedAt
              ? formatDatePtBR(cancellationProcess.startedAt)
              : 'Não informado'}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral">Conclusão</dt>
          <dd className="mt-1">
            {cancellationProcess.completedAt
              ? formatDatePtBR(cancellationProcess.completedAt)
              : 'Em andamento'}
          </dd>
        </div>
      </dl>

      {cancellationProcess.status !== 'COMPLETED' && nextPendingStep ? (
        <div className="mb-4 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-neutral">
          Próxima etapa pendente:{' '}
          <span className="font-medium text-foreground">
            {nextPendingStep.name}
          </span>
        </div>
      ) : null}

      {sortedSteps.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-neutral">
                  Etapa
                </th>
                <th className="px-6 py-3 text-left font-semibold text-neutral">
                  Status
                </th>
                <th className="px-6 py-3 text-left font-semibold text-neutral">
                  Protocolo
                </th>
                <th className="px-6 py-3 text-left font-semibold text-neutral">
                  Responsável
                </th>
                <th className="px-6 py-3 text-left font-semibold text-neutral">
                  Concluído em
                </th>
                <th className="px-6 py-3 text-left font-semibold text-neutral">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {sortedSteps.map((step) => {
                const actionState = resolveCancellationStepActionState({
                  step,
                  steps: sortedSteps,
                  processStatus: cancellationProcess.status,
                  userRoles,
                });
                const rowClassName =
                  getCancellationStepRowClassName(actionState);

                return (
                  <tr key={step.id} className={rowClassName}>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {step.name}
                      {actionState.isNextPending ? (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-neutral">
                          Próxima
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        label={getCancellationStepStatusLabel(step.status)}
                        variant={getCancellationStepStatusVariant(step.status)}
                      />
                    </td>
                    <td className="px-6 py-4 text-neutral">
                      {step.externalProtocol?.trim()
                        ? step.externalProtocol
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-neutral">
                      {step.completedByName?.trim()
                        ? step.completedByName
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-neutral">
                      {step.completedAt
                        ? formatDateTimePtBR(step.completedAt)
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {renderStepAction({
                        caseId,
                        cancellationId: cancellationProcess.id,
                        step,
                        actionState,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm leading-6 text-neutral">
          {cancellationProcess.status === 'COMPLETED'
            ? 'Nenhuma etapa registrada para este processo.'
            : 'Processo de cancelamento iniciado, mas nenhuma etapa operacional está disponível para exibição neste momento.'}
        </p>
      )}
    </SectionCard>
  );
}
