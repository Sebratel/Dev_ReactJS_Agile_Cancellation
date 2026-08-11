import { type RecoveryRankingPeriod } from '@/features/ranking/types/ranking-api.types';

export const RECOVERY_RANKING_PERIOD_OPTIONS: Array<{
  value: RecoveryRankingPeriod;
  label: string;
}> = [
  { value: 'current_month', label: 'Mês atual' },
  { value: 'last_month', label: 'Mês anterior' },
  { value: 'last_3_months', label: 'Últimos 3 meses' },
  { value: 'all', label: 'Acumulado' },
];

export function getRecoveryRankingPeriodLabel(period: RecoveryRankingPeriod) {
  return (
    RECOVERY_RANKING_PERIOD_OPTIONS.find((option) => option.value === period)
      ?.label ?? 'Mês atual'
  );
}

export function getRankingInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0]?.charAt(0) ?? '';
  const last =
    parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';

  return `${first}${last}`.toUpperCase() || '?';
}
