import { describe, expect, it } from 'vitest';
import { formatCurrencyBRL, formatDateOnlyPtBR } from '@/utils/formatters';

describe('formatCurrencyBRL', () => {
  it('formata valores BRL corretamente', () => {
    expect(formatCurrencyBRL(184750.42)).toBe('R$ 184.750,42');
  });
});

describe('formatDateOnlyPtBR', () => {
  it('extrai o dia calendario direto da string ISO, sem conversao de fuso', () => {
    // Regressao: vencimentos sao gravados como meia-noite UTC. Formatar via
    // `new Date(...)` deslocaria o dia em fusos atras de UTC (ex.: exibiria
    // 19/10/2025 para um vencimento de 20/10/2025), quebrando a busca por
    // data exata no filtro de vencimento.
    expect(formatDateOnlyPtBR('2025-10-20T00:00:00.000Z')).toBe('20/10/2025');
  });

  it('retorna null para valor vazio', () => {
    expect(formatDateOnlyPtBR(null)).toBeNull();
    expect(formatDateOnlyPtBR(undefined)).toBeNull();
  });
});
