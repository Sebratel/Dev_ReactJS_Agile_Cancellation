import { getSlaPresentation } from '@/features/collection-cases/utils/collection-case-labels';

// Apresentação compartilhada das linhas de caso nas listas (Supervisão, Minha
// cobrança, Cancelamentos...), para todas as telas lerem do mesmo jeito.

// O selo de SLA some quando não há SLA definido: aparecia em toda linha e não
// dizia nada. Só entra o que merece atenção (vencido, vence hoje...).
export function getVisibleSla(slaDueAt: string | null) {
  const sla = getSlaPresentation(slaDueAt);
  return sla.variant === 'neutral' ? null : sla;
}

export type OverdueSeverity = 'danger' | 'warning' | 'none';

// Gravidade pelos dias em atraso: vermelho a partir de 45, âmbar a partir de 30.
export function getOverdueSeverity(
  daysOverdue: number,
  isCritical = false,
): OverdueSeverity {
  if (isCritical || daysOverdue >= 45) return 'danger';
  if (daysOverdue >= 30) return 'warning';
  return 'none';
}

// A tabela usa `border-separate`, onde o navegador não desenha borda em <tr>:
// a faixa vai na primeira célula da linha.
export const SEVERITY_ROW_CLASS: Record<OverdueSeverity, string> = {
  danger:
    '[&>td:first-child]:border-l-[3px] [&>td:first-child]:border-l-danger',
  warning:
    '[&>td:first-child]:border-l-[3px] [&>td:first-child]:border-l-warning',
  none: '[&>td:first-child]:border-l-[3px] [&>td:first-child]:border-l-transparent',
};

export const SEVERITY_TEXT_CLASS: Record<OverdueSeverity, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  none: 'text-foreground',
};

// Clique na linha abre o detalhe, mas não quando o alvo é um controle dentro
// dela (checkbox, seletor de responsável, botões, links).
export function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest('a, button, input, select, textarea, label, [role]') !== null
  );
}
