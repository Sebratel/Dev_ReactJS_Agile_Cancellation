import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type StatusVariant } from '@/types/ui';

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon?: LucideIcon;
  variant?: StatusVariant;
  loading?: boolean;
  emphasis?: 'primary' | 'default';
  density?: 'default' | 'compact';
};

const accentStyles: Record<StatusVariant, string> = {
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
  neutral: 'border-l-border',
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'neutral',
  loading = false,
  emphasis = 'default',
  density = 'default',
}: MetricCardProps) {
  const isCompact = density === 'compact';

  return (
    <article
      className={cn(
        'rounded-lg border border-border/80 border-l-4 bg-card shadow-card animate-rise-in',
        'transition-[box-shadow,transform] duration-200 hover:shadow-card-hover hover:-translate-y-px',
        isCompact ? 'p-3' : 'p-4',
        accentStyles[variant],
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={isCompact ? 'space-y-1.5' : 'space-y-3'}>
          <p className="text-sm font-medium text-neutral">{title}</p>
          {loading ? (
            <Skeleton className={isCompact ? 'h-6 w-24' : 'h-8 w-32'} />
          ) : (
            <p
              className={cn(
                'font-bold tracking-tight tabular-nums',
                isCompact ? 'text-xl' : 'text-2xl',
                emphasis === 'primary' ? 'text-primary' : 'text-foreground',
              )}
            >
              {value}
            </p>
          )}
          {loading ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <p
              className={cn('text-neutral', isCompact ? 'text-xs' : 'text-sm')}
            >
              {description}
            </p>
          )}
        </div>
        {Icon ? (
          <div
            className={cn(
              'rounded-lg bg-muted text-neutral',
              isCompact ? 'p-2' : 'p-3',
            )}
          >
            <Icon className={isCompact ? 'h-4 w-4' : 'h-5 w-5'} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
