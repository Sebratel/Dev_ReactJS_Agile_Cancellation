import { StatusBadge } from '@/components/data-display/status-badge';
import { getHsmDeliveryPresentation } from '@/features/collection-cases/utils/collection-case-labels';
import { cn } from '@/lib/utils';

type HsmDeliveryBadgeProps = {
  state?: string | null;
  detail?: string | null;
  // 'inline': texto pequeno com ponto colorido, para seguir uma linha de texto
  // sem aumentar a altura da linha da tabela (o selo completo quebra a linha).
  inline?: boolean;
};

const INLINE_TONE_CLASS = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-neutral',
} as const;

export function HsmDeliveryBadge({
  state,
  detail,
  inline = false,
}: HsmDeliveryBadgeProps) {
  const presentation = getHsmDeliveryPresentation(state, detail);

  if (!presentation) {
    return null;
  }

  if (inline) {
    return (
      <>
        <span aria-hidden="true"> · </span>
        <span
          title={presentation.title}
          className={cn(
            'inline-flex items-center gap-1 font-medium',
            INLINE_TONE_CLASS[presentation.variant],
          )}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
            aria-hidden="true"
          />
          {presentation.label}
        </span>
      </>
    );
  }

  return (
    <span title={presentation.title} className="inline-flex">
      <StatusBadge label={presentation.label} variant={presentation.variant} />
    </span>
  );
}
