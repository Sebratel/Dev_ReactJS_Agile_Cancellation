import {
  AlertTriangle,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  RefreshCcw,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MetricCard } from '@/components/data-display/metric-card';
import { type DashboardMetric } from '@/features/dashboard/types/dashboard.types';

const metricIcons: Record<DashboardMetric['key'], LucideIcon> = {
  delinquentCustomers: Users,
  openAmount: BadgeDollarSign,
  inCollection: BriefcaseBusiness,
  eligibleForCancellation: AlertTriangle,
  recoveredMonth: CheckCircle2,
  activePromises: ClipboardCheck,
  overduePromises: RefreshCcw,
  cancellationsInProgress: Coins,
};

const PRIMARY_METRIC_KEYS: DashboardMetric['key'][] = [
  'openAmount',
  'eligibleForCancellation',
  'overduePromises',
  'cancellationsInProgress',
];

type DashboardKpiGridProps = {
  metrics: DashboardMetric[];
};

export function DashboardKpiGrid({ metrics }: DashboardKpiGridProps) {
  const primaryMetrics = metrics.filter((metric) =>
    PRIMARY_METRIC_KEYS.includes(metric.key),
  );
  const secondaryMetrics = metrics.filter(
    (metric) => !PRIMARY_METRIC_KEYS.includes(metric.key),
  );

  return (
    <div className="space-y-5">
      <section aria-label="Saúde da operação" className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral/80">
          Saúde da operação
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 card-stagger">
          {primaryMetrics.map((metric) => (
            <MetricCard
              key={metric.key}
              title={metric.title}
              value={metric.value}
              description={metric.description}
              variant={metric.variant}
              emphasis={metric.emphasis}
              icon={metricIcons[metric.key]}
            />
          ))}
        </div>
      </section>
      <section aria-label="Fluxo operacional" className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral/80">
          Fluxo operacional
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 card-stagger">
          {secondaryMetrics.map((metric) => (
            <MetricCard
              key={metric.key}
              title={metric.title}
              value={metric.value}
              description={metric.description}
              variant={metric.variant}
              emphasis="default"
              icon={metricIcons[metric.key]}
              density="compact"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
