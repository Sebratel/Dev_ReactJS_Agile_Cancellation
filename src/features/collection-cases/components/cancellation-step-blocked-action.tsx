import { Button } from '@/components/ui/button';

type CancellationStepBlockedActionProps = {
  label: string;
  reason: string;
};

export function CancellationStepBlockedAction({
  label,
  reason,
}: CancellationStepBlockedActionProps) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="secondary"
        className="px-3 py-1.5 text-xs"
        disabled
      >
        {label}
      </Button>
      <p className="max-w-xs text-xs text-neutral">{reason}</p>
    </div>
  );
}
