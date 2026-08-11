import { SectionCard } from '@/components/data-display/section-card';
import { type OperationalSummaryItem } from '@/features/dashboard/types/dashboard.types';

type OperationalSummaryProps = {
  items: OperationalSummaryItem[];
};

export function OperationalSummary({ items }: OperationalSummaryProps) {
  return (
    <SectionCard
      title="Resumo operacional"
      description="Leitura rápida dos principais acumulados do ciclo atual."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm font-medium text-neutral">{item.label}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">
              {item.value}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-neutral">
              {item.helperText}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
