import { type PropsWithChildren, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionCardProps = PropsWithChildren<{
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
}>;

export function SectionCard({
  title,
  description,
  actions,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <section className={cn('rounded-lg bg-card shadow-card animate-rise-in', className)}>
      {(title || description || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-3 py-2.5">
          <div>
            {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-neutral">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      )}
      <div className={cn('p-3', contentClassName)}>{children}</div>
    </section>
  );
}
