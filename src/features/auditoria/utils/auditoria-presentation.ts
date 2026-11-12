import {
  type AuditLogCategory,
  type AuditLogItem,
} from '@/features/auditoria/types/auditoria-api.types';

export const AUDIT_CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'Tudo' },
  { value: 'CONTACT', label: 'Contatos' },
  { value: 'PROMISE', label: 'Promessas' },
  { value: 'CANCELLATION', label: 'Cancelamentos' },
  { value: 'ASSIGNMENT', label: 'Atribuições' },
  { value: 'ACCESS', label: 'Acessos' },
  { value: 'EXPORT', label: 'Exportações' },
  { value: 'NOTE', label: 'Notas' },
  { value: 'ADMIN', label: 'Administração' },
  { value: 'MESSAGE', label: 'Envios em massa' },
] as const;

export const AUDIT_CATEGORY_LABELS: Record<AuditLogCategory, string> = {
  CONTACT: 'Contato',
  PROMISE: 'Promessa',
  CANCELLATION: 'Cancelamento',
  ASSIGNMENT: 'Atribuição',
  STATUS: 'Situação',
  ACCESS: 'Acesso',
  EXPORT: 'Exportação',
  NOTE: 'Nota',
  ADMIN: 'Administração',
  MESSAGE: 'Envio em massa',
  OTHER: 'Outros',
};

export const AUDIT_CATEGORY_VARIANTS: Record<
  AuditLogCategory,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  CONTACT: 'neutral',
  PROMISE: 'warning',
  CANCELLATION: 'danger',
  ASSIGNMENT: 'neutral',
  STATUS: 'success',
  ACCESS: 'neutral',
  EXPORT: 'neutral',
  NOTE: 'neutral',
  ADMIN: 'warning',
  MESSAGE: 'neutral',
  OTHER: 'neutral',
};

export type AuditPeriodPreset = 'today' | 'yesterday' | 'last7' | 'last30';

export const AUDIT_PERIOD_PRESETS: Array<{
  value: AuditPeriodPreset;
  label: string;
}> = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7', label: '7 dias' },
  { value: 'last30', label: '30 dias' },
];

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

export function getPeriodPresetRange(
  preset: AuditPeriodPreset,
  now: Date = new Date(),
): { startDate: string; endDate: string } {
  const today = toDateInput(now);

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today };
    case 'yesterday': {
      const yesterday = toDateInput(addDays(now, -1));
      return { startDate: yesterday, endDate: yesterday };
    }
    case 'last7':
      return { startDate: toDateInput(addDays(now, -6)), endDate: today };
    case 'last30':
      return { startDate: toDateInput(addDays(now, -29)), endDate: today };
  }
}

export function getActivePeriodPreset(
  startDate: string,
  endDate: string,
  now: Date = new Date(),
): AuditPeriodPreset | null {
  if (!startDate || !endDate) {
    return null;
  }

  for (const preset of AUDIT_PERIOD_PRESETS) {
    const range = getPeriodPresetRange(preset.value, now);

    if (range.startDate === startDate && range.endDate === endDate) {
      return preset.value;
    }
  }

  return null;
}

export type AuditDayGroup = {
  key: string;
  label: string;
  items: AuditLogItem[];
};

function formatDayLabel(date: Date, now: Date) {
  const key = toDateInput(date);
  const formatted = date.toLocaleDateString('pt-BR');

  if (key === toDateInput(now)) {
    return `Hoje, ${formatted}`;
  }

  if (key === toDateInput(addDays(now, -1))) {
    return `Ontem, ${formatted}`;
  }

  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });

  return `${formatted} · ${weekday}`;
}

// Agrupa os registros (já em ordem decrescente) por dia local.
export function groupAuditLogsByDay(
  items: AuditLogItem[],
  now: Date = new Date(),
): AuditDayGroup[] {
  const groups: AuditDayGroup[] = [];

  for (const item of items) {
    const date = new Date(item.createdAt);
    const key = toDateInput(date);
    const last = groups[groups.length - 1];

    if (last?.key === key) {
      last.items.push(item);
      continue;
    }

    groups.push({ key, label: formatDayLabel(date, now), items: [item] });
  }

  return groups;
}

export function formatAuditTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getAuditCategory(item: AuditLogItem): AuditLogCategory {
  return item.category ?? 'OTHER';
}
