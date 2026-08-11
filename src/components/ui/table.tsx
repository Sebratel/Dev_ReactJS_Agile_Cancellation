import {
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

type TableContainerProps = HTMLAttributes<HTMLDivElement> & {
  /** flush: sem borda propria (para uso dentro de SectionCard com p-0) */
  flush?: boolean;
};

export function TableContainer({
  className,
  flush = false,
  children,
  ...props
}: TableContainerProps) {
  return (
    <div
      className={cn(
        'overflow-x-auto animate-fade-in',
        !flush && 'rounded-lg border border-border bg-card',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full text-sm', className)} {...props}>
      {children}
    </table>
  );
}

type TableHeadProps = HTMLAttributes<HTMLTableSectionElement> & {
  /** fixa o cabecalho no topo durante o scroll do container */
  sticky?: boolean;
};

export function TableHead({
  className,
  sticky = false,
  children,
  ...props
}: TableHeadProps) {
  return (
    <thead
      className={cn('bg-muted', sticky && 'sticky top-0 z-10', className)}
      {...props}
    >
      {children}
    </thead>
  );
}

type TableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  align?: 'left' | 'center' | 'right';
};

export function TableHeaderCell({
  className,
  align = 'left',
  children,
  ...props
}: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('divide-y divide-border bg-card table-stagger', className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors duration-200 hover:bg-muted/50',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  /** alinha a direita com font-variant tabular (valores e contagens) */
  numeric?: boolean;
  align?: 'left' | 'center' | 'right';
};

export function TableCell({
  className,
  numeric = false,
  align,
  children,
  ...props
}: TableCellProps) {
  return (
    <td
      className={cn(
        'px-3 py-1.5',
        numeric && 'text-right tabular-nums',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
