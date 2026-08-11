import { type PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

type PageContainerProps = PropsWithChildren<{
  className?: string;
}>;

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-4 py-3 sm:px-6 animate-rise-in-md',
        className,
      )}
    >
      {children}
    </div>
  );
}
