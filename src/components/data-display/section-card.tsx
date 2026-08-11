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
    <section
      className={cn(
        'rounded-lg border border-border/80 bg-card shadow-card animate-rise-in',
        className,
      )}
    >
      {(title || description || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border/80 px-4 py-3">
          <div>
            {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 max-w-2xl text-xs leading-5 text-neutral">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      )}
      <div className={cn('p-4', contentClassName)}>{children}</div>
    </section>
  );
}
