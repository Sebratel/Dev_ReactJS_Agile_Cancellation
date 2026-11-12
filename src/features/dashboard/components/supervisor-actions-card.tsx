import { Link } from 'react-router-dom';
import { Check, ChevronRight, type LucideIcon } from 'lucide-react';
import { SectionCard } from '@/components/data-display/section-card';
import { cn } from '@/lib/utils';
import {
  splitSupervisorActions,
  type SupervisorActionItem,
  type SupervisorActionTone,
} from '@/features/dashboard/utils/supervisor-actions';
import { formatInteger } from '@/utils/formatters';

export type SupervisorAction = SupervisorActionItem<LucideIcon>;

type SupervisorActionsCardProps = {
  actions: SupervisorAction[];
  onRetry?: () => void;
};

const TONE_CLASSES: Record<SupervisorActionTone, string> = {
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/15 text-warning',
  neutral: 'bg-muted text-neutral',
};

const COUNT_CLASSES: Record<SupervisorActionTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  neutral: 'text-foreground',
};

function ActionRow({
  action,
  onRetry,
}: {
  action: SupervisorAction;
  onRetry?: () => void;
}) {
  const Icon = action.icon;
  const unavailable = action.value === 'unavailable';

  return (
    <li>
      <Link
        to={action.href}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            typeof action.value === 'number'
              ? TONE_CLASSES[action.tone]
              : 'bg-muted text-neutral',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{action.label}</span>
          <span className="block truncate text-xs text-neutral">
            {unavailable ? 'não foi possível carregar' : action.helper}
          </span>
        </span>
        {unavailable && onRetry ? (
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-primary hover:underline"
            onClick={(event) => {
              event.preventDefault();
              onRetry();
            }}
          >
            tentar novamente
          </button>
        ) : null}
        <span
          className={cn(
            'shrink-0 text-lg font-bold tabular-nums',
            typeof action.value === 'number'
              ? COUNT_CLASSES[action.tone]
              : 'text-neutral',
          )}
        >
          {typeof action.value === 'number'
            ? formatInteger(action.value)
            : action.value === 'loading'
              ? '…'
              : '—'}
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-neutral"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

// "Precisa de ação" por urgência: pendências primeiro, itens sem dado depois e
// os zerados apagados no fim (não disputam o olhar).
export function SupervisorActionsCard({
  actions,
  onRetry,
}: SupervisorActionsCardProps) {
  const { urgent, pending, calm } = splitSupervisorActions(actions);

  return (
    <SectionCard
      title="Precisa de ação"
      description="Do mais urgente para o menos urgente."
      contentClassName="p-3"
    >
      <ul>
        {urgent.map((action) => (
          <ActionRow key={action.key} action={action} />
        ))}
        {pending.map((action) => (
          <ActionRow key={action.key} action={action} onRetry={onRetry} />
        ))}
      </ul>

      {urgent.length === 0 && pending.length === 0 ? (
        <p className="px-3 py-4 text-sm text-neutral">
          Nada pendente agora. Bom trabalho.
        </p>
      ) : null}

      {calm.length > 0 ? (
        <div className="mt-2 border-t border-border px-3 pt-3">
          <p className="mb-2 text-xs font-medium text-neutral">Em dia</p>
          <ul className="space-y-1.5 text-sm text-neutral">
            {calm.map((action) => (
              <li key={action.key} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="flex-1">{action.label}</span>
                <span className="tabular-nums">0</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}
