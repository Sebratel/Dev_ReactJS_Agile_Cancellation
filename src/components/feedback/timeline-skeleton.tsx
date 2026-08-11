import { Skeleton } from '@/components/ui/skeleton';

type TimelineSkeletonProps = {
  items?: number;
};

export function TimelineSkeleton({ items = 3 }: TimelineSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={`timeline-skeleton-${index}`}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
