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

type AssignCaseActionProps = {
  caseId: string;
  currentAssigneeId: string | null;
};

export function AssignCaseAction({
  caseId,
  currentAssigneeId,
}: AssignCaseActionProps) {
  const [selectedId, setSelectedId] = useState(currentAssigneeId ?? '');

  const agentsQuery = useUsers({
    role: 'COLLECTION_AGENT',
    status: 'ACTIVE',
    limit: 100,
  });
  const mutation = useAssignCase(caseId);

  useEffect(() => {
    setSelectedId(currentAssigneeId ?? '');
  }, [currentAssigneeId]);

  const agents = agentsQuery.data?.items ?? [];
  const isDirty = selectedId !== (currentAssigneeId ?? '');

  async function handleSave() {
    try {
      await mutation.mutateAsync({ assignedUserId: selectedId || null });
      toast.success(
        selectedId
          ? 'Caso atribuído com sucesso.'
          : 'Atribuição removida com sucesso.',
      );
    } catch {
      return;
    }
  }

  const apiErrorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
        ? 'Não foi possível atualizar a atribuição.'
        : null;

  return (
    <SectionCard
      title="Distribuição"
      description="Defina o colaborador de cobrança responsável por este caso."
    >
      <div className="space-y-3">
        <div className="sm:max-w-sm">
          <Select
            value={selectedId}
            disabled={agentsQuery.isLoading || mutation.isPending}
            onChange={(event) => setSelectedId(event.target.value)}
            aria-label="Responsável pelo caso"
          >
            <option value="">Não atribuído</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} — {agent.roles.map(getRoleLabel).join(', ')}
              </option>
            ))}
          </Select>
        </div>

        {agentsQuery.isError ? (
          <p className="text-sm text-danger">
            Não foi possível carregar a lista de colaboradores.
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
          {mutation.isPending ? 'Salvando...' : 'Salvar responsável'}
        </Button>
      </div>
    </SectionCard>
  );
}
