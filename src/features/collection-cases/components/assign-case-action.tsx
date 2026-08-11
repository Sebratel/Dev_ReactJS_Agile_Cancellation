import { useEffect, useState } from 'react';
import { SectionCard } from '@/components/data-display/section-card';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAssignCase } from '@/features/collection-cases/hooks/use-assign-case';
import { useUsers } from '@/features/users/hooks/use-users';
import { getRoleLabel } from '@/features/users/utils/user-labels';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';
import { type UserRole } from '@/types/auth';

type AssignCaseActionProps = {
  caseId: string;
  currentAssigneeId: string | null;
  targetRole?: Extract<UserRole, 'COLLECTION_AGENT' | 'CANCELLATION_AGENT'>;
};

export function AssignCaseAction({
  caseId,
  currentAssigneeId,
  targetRole = 'COLLECTION_AGENT',
}: AssignCaseActionProps) {
  const [selectedId, setSelectedId] = useState(currentAssigneeId ?? '');

  const agentsQuery = useUsers({
    status: 'ACTIVE',
    role: targetRole,
    limit: 100,
  });
  const mutation = useAssignCase(caseId);

  useEffect(() => {
    setSelectedId(currentAssigneeId ?? '');
  }, [currentAssigneeId]);

  const agents = agentsQuery.data?.items ?? [];
  const isDirty = selectedId !== (currentAssigneeId ?? '');
  const isCancellationAssignment = targetRole === 'CANCELLATION_AGENT';

  async function handleSave() {
    try {
      await mutation.mutateAsync({ assignedUserId: selectedId || null });
      toast.success(
        selectedId
          ? 'Caso atribuido com sucesso.'
          : 'Atribuicao removida com sucesso.',
      );
    } catch {
      return;
    }
  }

  const apiErrorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
        ? 'Nao foi possivel atualizar a atribuicao.'
        : null;

  return (
    <SectionCard
      title="Distribuicao"
      description={
        isCancellationAssignment
          ? 'Defina o atendente de cancelamento responsavel por este processo.'
          : 'Defina o atendente de cobranca responsavel por este caso.'
      }
    >
      <div className="space-y-3">
        <div className="sm:max-w-sm">
          <Select
            value={selectedId}
            disabled={agentsQuery.isLoading || mutation.isPending}
            onChange={(event) => setSelectedId(event.target.value)}
            aria-label="Responsavel pelo caso"
          >
            <option value="">Nao atribuido</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} - {agent.email} -{' '}
                {agent.roles.map(getRoleLabel).join(', ')}
              </option>
            ))}
          </Select>
        </div>

        {agentsQuery.isError ? (
          <p className="text-sm text-danger">
            Nao foi possivel carregar a lista de colaboradores.
          </p>
        ) : null}

        {apiErrorMessage ? (
          <ErrorState
            title="Falha ao distribuir"
            description={apiErrorMessage}
          />
        ) : null}

        <Button
          onClick={() => {
            void handleSave();
          }}
          disabled={!isDirty || mutation.isPending}
        >
          {mutation.isPending ? 'Salvando...' : 'Salvar responsavel'}
        </Button>
      </div>
    </SectionCard>
  );
}
