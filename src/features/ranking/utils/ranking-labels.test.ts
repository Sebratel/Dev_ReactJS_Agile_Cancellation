import { describe, expect, it } from 'vitest';
import {
  getRankingInitials,
  getRecoveryRankingPeriodLabel,
} from '@/features/ranking/utils/ranking-labels';

describe('getRecoveryRankingPeriodLabel', () => {
  it('retorna o rotulo do periodo', () => {
    expect(getRecoveryRankingPeriodLabel('current_month')).toBe('Mês atual');
    expect(getRecoveryRankingPeriodLabel('last_month')).toBe('Mês anterior');
    expect(getRecoveryRankingPeriodLabel('last_3_months')).toBe(
      'Últimos 3 meses',
    );
    expect(getRecoveryRankingPeriodLabel('all')).toBe('Acumulado');
  });
});

describe('getRankingInitials', () => {
  it('usa a primeira e ultima inicial', () => {
    expect(getRankingInitials('Marina Lopes')).toBe('ML');
    expect(getRankingInitials('Carlos')).toBe('C');
  });

  it('trata nome vazio', () => {
    expect(getRankingInitials('   ')).toBe('?');
  });
});
