import { type PropsWithChildren, type ReactNode } from 'react';

type PageHeaderProps = PropsWithChildren<{
  title: string;
  description: string;
  actions?: ReactNode;
}>;

export function PageHeader({
  title,
  description,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <header className="flex min-w-0 flex-col gap-3 border-b border-border/70 pb-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="h-1 w-9 rounded-full bg-primary" aria-hidden="true" />
          <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral">
            {description}
          </p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </header>
  );
}
