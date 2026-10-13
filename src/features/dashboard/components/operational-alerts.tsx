import { AlertTriangle, ArrowRight, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionCard } from '@/components/data-display/section-card';
import { StatusBadge } from '@/components/data-display/status-badge';
import { cn } from '@/lib/utils';
import { type OperationalAlert } from '@/features/dashboard/types/dashboard.types';
import { formatInteger } from '@/utils/formatters';

type OperationalAlertsProps = {
  alerts: OperationalAlert[];
  maxItems?: number;
  compact?: boolean;
};

export function OperationalAlerts({
  alerts,
  maxItems,
  compact = false,
}: OperationalAlertsProps) {
  const visibleAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;

  return (
    <SectionCard
      title="Requer atenção"
      description="Ocorrências que demandam prioridade imediata da supervisão."
      contentClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {visibleAlerts.map((alert) => {
          const isDanger = alert.variant === 'danger';
          const Icon = isDanger ? AlertTriangle : BellRing;

          return (
            <li
              key={alert.key}
              className={cn(
                'relative flex flex-col gap-3 transition-colors duration-150 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between',
                compact ? 'px-4 py-3' : 'px-6 py-4',
              )}
            >
              {isDanger ? (
                <span
                  className="absolute inset-y-0 left-0 w-[3px] bg-danger"
                  aria-hidden="true"
                />
              ) : null}
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    isDanger
                      ? 'bg-danger/10 text-danger'
                      : 'bg-muted text-neutral',
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p
                    className={cn(
                      'text-sm text-neutral',
                      compact ? 'line-clamp-1 leading-5' : 'leading-6',
                    )}
                  >
                    {alert.description}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 pl-11 sm:pl-0">
                <StatusBadge
                  label={
                    alert.notice ?? `${formatInteger(alert.count)} casos`
                  }
                  variant={alert.variant}
                />
                {alert.supervisionHref ? (
                  <Link
                    to={alert.supervisionHref}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary"
                  >
                    Revisar
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {maxItems && alerts.length > maxItems ? (
        <div className="border-t border-border px-4 py-3 text-xs font-semibold text-neutral">
          + {formatInteger(alerts.length - maxItems)} alertas na análise detalhada
        </div>
      ) : null}
    </SectionCard>
  );
}
