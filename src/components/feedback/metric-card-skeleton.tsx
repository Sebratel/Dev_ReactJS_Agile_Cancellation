import { Skeleton } from '@/components/ui/skeleton';

type MetricCardSkeletonProps = {
  count?: number;
};

export function MetricCardSkeleton({ count = 4 }: MetricCardSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`metric-skeleton-${index}`}
          className="rounded-2xl border-l-4 border-l-border bg-card p-5 shadow-card"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-8 w-24" />
          <Skeleton className="mt-3 h-4 w-48" />
        </div>
      ))}
    </div>
  );
}
