// Motivo do cancelamento vindo do ERP (Elleven), da tabela `contract_events`
// (ex.: "Cancelamento - Inadimplência", "Cancelamento - Mudança de Endereço").
// Aqui normalizamos e CATEGORIZAMOS esse motivo numa visão estratégica para a
// operação de cobrança:
//  - INADIMPLENCIA: cliente saiu por não pagar — é a batalha da cobrança (perda
//    potencialmente evitável).
//  - EXTERNO: cliente sairia de qualquer jeito (mudança, concorrência, óbito,
//    insatisfação...) — não é falha da cobrança.
//  - OUTRO: motivo não informado ou não classificável.

// Valor do filtro/rótulo para contratos cancelados sem motivo informado.
export const NO_CANCELLATION_REASON_LABEL = 'Sem motivo registrado';

export type CancellationReasonCategory = 'INADIMPLENCIA' | 'EXTERNO' | 'OUTRO';

const INADIMPLENCIA_HINTS = ['inadimpl', 'dificuldade financeira'];

const EXTERNO_HINTS = [
  'mudanca de endere',
  'mudança de endere',
  'concorrenc',
  'concorrênc',
  'insatisf',
  'falecimento',
  'nao utiliza',
  'não utiliza',
  'empresarial',
  'nao instalado',
  'não instalado',
  'mudanca',
  'mudança',
  'endereco',
  'endereço',
  'cortesia',
  'permuta',
];

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Classifica um motivo bruto do ERP numa das categorias estratégicas.
 * Importante: INADIMPLÊNCIA tem precedência (é o foco da cobrança).
 */
export function categorizeCancellationReason(
  reason: string | null | undefined,
): CancellationReasonCategory {
  if (!reason) {
    return 'OUTRO';
  }

  const normalized = normalize(reason);

  if (
    INADIMPLENCIA_HINTS.some((hint) => normalized.includes(normalize(hint)))
  ) {
    return 'INADIMPLENCIA';
  }

  if (EXTERNO_HINTS.some((hint) => normalized.includes(normalize(hint)))) {
    return 'EXTERNO';
  }

  return 'OUTRO';
}

/**
 * Rótulo limpo do motivo para exibição — tira o prefixo "Cancelamento - ".
 */
export function cleanCancellationReasonLabel(
  reason: string | null | undefined,
): string | null {
  if (!reason) {
    return null;
  }

  return reason.replace(/^\s*cancelamento\s*[-–:]\s*/i, '').trim() || reason;
}

/** Rótulo amigável de cada categoria. */
export function cancellationReasonCategoryLabel(
  category: CancellationReasonCategory,
): string {
  switch (category) {
    case 'INADIMPLENCIA':
      return 'Inadimplência';
    case 'EXTERNO':
      return 'Motivo externo';
    default:
      return 'Outro / não informado';
  }
}
