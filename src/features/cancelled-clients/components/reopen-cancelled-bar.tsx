import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BulkAssigneePicker } from '@/features/supervision/components/bulk-assignee-picker';
import { type UserResponse } from '@/features/users/types/users-api.types';
import { formatInteger } from '@/utils/formatters';

type ReopenCancelledBarProps = {
  selectedCount: number;
  agents: UserResponse[];
  workload?: Record<string, number>;
  isSubmitting: boolean;
  onConfirm: (assignedUserId: string) => void;
  onClear: () => void;
};

// Barra de ação da supervisão: devolve os cancelados selecionados à carteira de
// um atendente (novo ciclo). O caso continua cancelado até o ERP reativar.
export function ReopenCancelledBar({
  selectedCount,
  agents,
  workload,
  isSubmitting,
  onConfirm,
  onClear,
}: ReopenCancelledBarProps) {
  const [agentId, setAgentId] = useState('');

  useEffect(() => {
    if (selectedCount === 0) setAgentId('');
  }, [selectedCount]);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 animate-rise-in-md">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-lg border border-border bg-card px-5 py-3 shadow-floating">
        <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
          {formatInteger(selectedCount)}
        </span>
        <span className="shrink-0 whitespace-nowrap text-sm font-medium">
          {selectedCount === 1
            ? 'cliente cancelado selecionado'
            : 'clientes cancelados selecionados'}
        </span>
        <BulkAssigneePicker
          agents={agents}
          workload={workload}
          value={agentId}
          onChange={setAgentId}
          disabled={isSubmitting}
        />
        <Button
          size="sm"
          className="shrink-0 whitespace-nowrap"
          disabled={!agentId || isSubmitting}
          onClick={() => onConfirm(agentId)}
        >
          {isSubmitting ? 'Devolvendo...' : 'Devolver à carteira'}
        </Button>
        <button
          type="button"
          onClick={onClear}
          disabled={isSubmitting}
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
