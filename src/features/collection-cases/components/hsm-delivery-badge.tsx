import { StatusBadge } from '@/components/data-display/status-badge';
import { getHsmDeliveryPresentation } from '@/features/collection-cases/utils/collection-case-labels';

type HsmDeliveryBadgeProps = {
  state?: string | null;
  detail?: string | null;
};

export function HsmDeliveryBadge({ state, detail }: HsmDeliveryBadgeProps) {
  const presentation = getHsmDeliveryPresentation(state, detail);

  if (!presentation) {
    return null;
  }

  return (
    <span title={presentation.title} className="inline-flex">
      <StatusBadge label={presentation.label} variant={presentation.variant} />
    </span>
  );
}
