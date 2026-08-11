import { SectionCard } from '@/components/data-display/section-card';
import { OperationalMetricsCard } from '@/features/dashboard/components/operational-metrics-card';
import { type OperationalMetricsGroup } from '@/features/dashboard/types/dashboard.types';

type OperationalMetricsGridProps = {
  groups: OperationalMetricsGroup[];
  loading?: boolean;
};

export function OperationalMetricsGrid({
  groups,
  loading = false,
}: OperationalMetricsGridProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <SectionCard
          key={group.key}
          title={group.title}
          description={group.description}
        >
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {group.metrics.map((metric) => (
              <OperationalMetricsCard
                key={metric.key}
                metric={metric}
                loading={loading}
              />
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
