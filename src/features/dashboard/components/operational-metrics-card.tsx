import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { cn } from '@/lib/utils';
import { type OperationalMetricItem } from '@/features/dashboard/types/dashboard.types';

type OperationalMetricsCardProps = {
  metric: OperationalMetricItem;
  loading?: boolean;
};

export function OperationalMetricsCard({
  metric,
  loading = false,
}: OperationalMetricsCardProps) {
  const card = (
    <MetricCard
      title={metric.label}
      value={metric.value}
      description={metric.description}
      variant={metric.variant ?? 'neutral'}
      loading={loading}
    />
  );

  if (!metric.href || loading) {
    return card;
  }

  return (
    <Link
      to={metric.href}
      aria-label={metric.ariaLabel}
      className={cn(
        'group block rounded-2xl outline-none transition-shadow duration-150',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'hover:shadow-card-hover',
      )}
    >
      <div className="relative">
        {card}
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
