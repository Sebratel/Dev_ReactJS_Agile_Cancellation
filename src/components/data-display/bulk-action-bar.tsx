import { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BulkContactWhatsAppAction } from '@/features/collection-cases/components/bulk-contact-whatsapp-action';
import { BulkSendToCancellationAction } from '@/features/collection-cases/components/bulk-send-to-cancellation-action';
import { type UserResponse } from '@/features/users/types/users-api.types';

type BulkActionBarProps = {
  selectedCount: number;
  selectedCaseIds: string[];
  agents: UserResponse[];
  workload?: Record<string, number>;
  onBulkAssign: (assignedUserId: string | null) => void;
  onClearSelection: () => void;
  isAssigning: boolean;
};

export function BulkActionBar({
  selectedCount,
  selectedCaseIds,
  agents,
  workload,
  onBulkAssign,
  onClearSelection,
  isAssigning,
}: BulkActionBarProps) {
  const [agentId, setAgentId] = useState('');

  useEffect(() => {
    if (selectedCount === 0) setAgentId('');
  }, [selectedCount]);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 animate-rise-in-md">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-lg border border-border bg-card px-5 py-3 shadow-floating">
        <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
          {selectedCount}
        </span>
        <span className="shrink-0 whitespace-nowrap text-sm font-medium text-foreground">
          {selectedCount === 1 ? 'caso selecionado' : 'casos selecionados'}
        </span>
        <div className="relative shrink-0">
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            disabled={isAssigning}
            className="h-8 min-w-[180px] appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm text-foreground transition-colors hover:border-neutral/40 disabled:opacity-50"
          >
            <option value="">Selecionar pessoa...</option>
            <option value="__remove__">— Remover atribuição</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} - {a.email}
                {workload ? ` (${workload[a.id] ?? 0} casos)` : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral"
            aria-hidden="true"
          />
        </div>

        <Button
          size="sm"
          className="shrink-0 whitespace-nowrap"
          disabled={!agentId || isAssigning}
          onClick={() =>
            onBulkAssign(agentId === '__remove__' ? null : agentId)
          }
        >
          {isAssigning ? 'Atribuindo...' : 'Atribuir'}
        </Button>
        <div className="shrink-0">
          <BulkContactWhatsAppAction
            caseIds={selectedCaseIds}
            onFinished={onClearSelection}
          />
        </div>
        <div className="shrink-0">
          <BulkSendToCancellationAction
            caseIds={selectedCaseIds}
            onFinished={onClearSelection}
          />
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          disabled={isAssigning}
          className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-neutral transition-colors hover:text-foreground disabled:opacity-50"
          aria-label="Limpar seleção"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </button>
      </div>
    </div>
  );
}

