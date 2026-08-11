import { describe, expect, it } from 'vitest';
import { formatCurrencyBRL } from '@/utils/formatters';

describe('formatCurrencyBRL', () => {
  it('formata valores BRL corretamente', () => {
    expect(formatCurrencyBRL(184750.42)).toBe('R$ 184.750,42');
  });
});
