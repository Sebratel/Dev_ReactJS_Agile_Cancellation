import { Button } from '@/components/ui/button';

type ErrorStateProps = {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-danger/20 bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-danger">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral">{description}</p>
      {retryLabel && onRetry ? (
        <div className="mt-4">
          <Button variant="danger" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
