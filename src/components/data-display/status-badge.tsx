import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { type StatusVariant } from '@/types/ui';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
  {
    variants: {
      variant: {
        success: 'border-success/25 bg-success/10 text-success',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        danger: 'border-danger/25 bg-danger/10 text-danger',
        neutral: 'border-border bg-muted text-neutral',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

const dotStyles: Record<StatusVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral/60',
};

type StatusBadgeProps = {
  label: string;
  variant: StatusVariant;
  dot?: boolean;
};

export function StatusBadge({ label, variant, dot = true }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }))}>
      {dot ? (
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            dotStyles[variant],
          )}
          aria-hidden="true"
        />
      ) : null}
      {label}
    </span>
  );
}
