import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssigneeAvatar } from '@/features/supervision/components/assignee-avatar';
import { type UserResponse } from '@/features/users/types/users-api.types';
import { cn } from '@/lib/utils';

export const REMOVE_ASSIGNMENT_VALUE = '__remove__';

type BulkAssigneePickerProps = {
  agents: UserResponse[];
  workload?: Record<string, number>;
  /** '' = nenhum, '__remove__' = remover atribuição, ou o id do agente. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

// Dropdown customizado (com foto/iniciais) para escolher o responsável na barra
// de ações em lote. Substitui o <select> nativo, que não renderiza imagem.
// Abre para cima, já que a barra fica no rodapé da tela.
export function BulkAssigneePicker({
  agents,
  workload,
  value,
  onChange,
  disabled,
}: BulkAssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, bottom: 0, width: 240 });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedAgent = agents.find((agent) => agent.id === value) ?? null;

  function updatePosition() {
    const trigger = containerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const width = Math.max(rect.width, 240);
    const left = Math.min(
      Math.max(rect.left, margin),
      window.innerWidth - width - margin,
    );
    const bottom = window.innerHeight - rect.top + 6;

    setPosition({ left, bottom, width });
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function handleSelect(next: string) {
    onChange(next);
    setOpen(false);
  }

  const triggerLabel =
    value === REMOVE_ASSIGNMENT_VALUE
      ? 'Remover atribuição'
      : (selectedAgent?.name ?? 'Selecionar pessoa...');
  const isPlaceholder = value === '';

  const menu = open ? (
    <div
      ref={menuRef}
      className="fixed z-[9999] max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-floating"
      style={{
        left: position.left,
        bottom: position.bottom,
        width: position.width,
      }}
    >
      <div role="listbox" aria-label="Selecionar responsável">
        <button
          type="button"
          role="option"
          aria-selected={value === REMOVE_ASSIGNMENT_VALUE}
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-md px-2 text-left transition-colors',
            value === REMOVE_ASSIGNMENT_VALUE
              ? 'bg-primary/10 text-foreground'
              : 'hover:bg-muted',
          )}
          onClick={() => handleSelect(REMOVE_ASSIGNMENT_VALUE)}
        >
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-neutral">
            — Remover atribuição
          </span>
          {value === REMOVE_ASSIGNMENT_VALUE ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
          ) : null}
        </button>

        {agents.map((agent) => {
          const selected = agent.id === value;
          return (
            <button
              key={agent.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={cn(
                'flex h-9 w-full items-center gap-2 rounded-md px-2 text-left transition-colors',
                selected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted',
              )}
              onClick={() => handleSelect(agent.id)}
            >
              <AssigneeAvatar name={agent.name} avatarUrl={agent.avatarUrl} />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                {agent.name}
              </span>
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-neutral">
                {workload ? `${workload[agent.id] ?? 0} casos` : ''}
              </span>
              {selected ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Selecionar responsável"
        className={cn(
          'flex h-8 w-[200px] items-center gap-2 rounded-md border border-border bg-card px-2 text-left text-sm transition-colors',
          'hover:border-neutral/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          open && 'border-primary/70 ring-2 ring-primary/15',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedAgent ? (
          <AssigneeAvatar
            name={selectedAgent.name}
            avatarUrl={selectedAgent.avatarUrl}
          />
        ) : null}
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            isPlaceholder ? 'text-neutral' : 'text-foreground',
          )}
        >
          {triggerLabel}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral" />
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
