import { Select } from '@/components/ui/select';
import { useAssignCase } from '@/features/collection-cases/hooks/use-assign-case';
import { type CollectionCaseAssigneeSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { type UserResponse } from '@/features/users/types/users-api.types';
import { toast } from '@/lib/toast';
import { ApiError } from '@/services/api/api-error';

type InlineAssigneeSelectProps = {
  caseId: string;
  currentAssignee: CollectionCaseAssigneeSummary | null;
  agents: UserResponse[];
  agentsLoading: boolean;
  workload?: Record<string, number>;
};

export function InlineAssigneeSelect({
  caseId,
  currentAssignee,
  agents,
  agentsLoading,
  workload,
}: InlineAssigneeSelectProps) {
  const mutation = useAssignCase(caseId);

  async function handleChange(value: string) {
    try {
      await mutation.mutateAsync({ assignedUserId: value || null });
      toast.success(
        value ? 'Caso atribuído com sucesso.' : 'Atribuição removida com sucesso.',
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível atualizar a atribuição.',
      );
    }
  }

  return (
    <Select
      value={currentAssignee?.id ?? ''}
      disabled={agentsLoading || mutation.isPending}
      onChange={(event) => {
        void handleChange(event.target.value);
      }}
      aria-label={`Responsável pelo caso ${caseId}`}
      className="h-8 text-xs"
    >
      <option value="">Não atribuído</option>
      {agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name} - {agent.email}
          {workload ? ` (${workload[agent.id] ?? 0} casos)` : ''}
        </option>
      ))}
    </Select>
  );
}

