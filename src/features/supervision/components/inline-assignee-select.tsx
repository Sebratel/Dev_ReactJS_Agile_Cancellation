import { Check, ChevronDown, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAssignCase } from '@/features/collection-cases/hooks/use-assign-case';
import { type CollectionCaseAssigneeSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { type UserResponse } from '@/features/users/types/users-api.types';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedAgent =
    agents.find((agent) => agent.id === currentAssignee?.id) ?? null;
  const disabled = agentsLoading || mutation.isPending;

  async function handleChange(value: string) {
    try {
      await mutation.mutateAsync({ assignedUserId: value || null });
      setOpen(false);
      toast.success(
        value
          ? 'Caso atribuido com sucesso.'
          : 'Atribuicao removida com sucesso.',
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Nao foi possivel atualizar a atribuicao.',
      );
    }
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-[190px]">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Responsavel pelo caso ${caseId}`}
        className={cn(
          'flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-card px-2 text-left text-xs shadow-sm transition-colors',
          'hover:border-primary/50 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          open && 'border-primary/70 ring-2 ring-primary/15',
          disabled && 'cursor-not-allowed opacity-60',
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <AssigneeAvatar
          name={selectedAgent?.name ?? currentAssignee?.name ?? 'Nao atribuido'}
          avatarUrl={selectedAgent?.avatarUrl}
        />
        <span className="min-w-0 flex-1 truncate font-medium">
          {selectedAgent?.name ?? currentAssignee?.name ?? 'Nao atribuido'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1 max-h-64 w-[260px] overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-floating">
          <div role="listbox" aria-label={`Responsavel pelo caso ${caseId}`}>
            <AssigneeOption
              selected={!currentAssignee}
              name="Nao atribuido"
              meta="Sem responsavel"
              onSelect={() => {
                void handleChange('');
              }}
            />
            {agents.map((agent) => (
              <AssigneeOption
                key={agent.id}
                selected={agent.id === currentAssignee?.id}
                name={agent.name}
                avatarUrl={agent.avatarUrl}
                meta={
                  workload ? `${workload[agent.id] ?? 0} casos` : agent.email
                }
                onSelect={() => {
                  void handleChange(agent.id);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? '') : '';

  return `${first}${last}`.toUpperCase() || '?';
}

function AssigneeAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-5 w-5 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (name === 'Nao atribuido') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-neutral">
        <UserRound className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-foreground">
      {getInitials(name)}
    </span>
  );
}

function AssigneeOption({
  selected,
  name,
  meta,
  avatarUrl,
  onSelect,
}: {
  selected: boolean;
  name: string;
  meta: string;
  avatarUrl?: string | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-md px-2 text-left transition-colors',
        selected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted',
      )}
      onClick={onSelect}
    >
      <AssigneeAvatar name={name} avatarUrl={avatarUrl} />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
        {name}
      </span>
      <span className="max-w-[82px] shrink-0 truncate rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-neutral">
        {meta}
      </span>
      {selected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
      ) : null}
    </button>
  );
}
