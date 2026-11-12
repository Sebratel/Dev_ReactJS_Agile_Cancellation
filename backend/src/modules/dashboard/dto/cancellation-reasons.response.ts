// Relatório de cancelamentos por MOTIVO, com a visão estratégica da cobrança:
// separa "Inadimplência" (batalha da cobrança) de "Motivo externo" (o cliente
// sairia de qualquer jeito) e "Outro / não informado".

export type CancellationReasonCategoryBreakdown = {
  category: string; // INADIMPLENCIA | EXTERNO | OUTRO
  label: string;
  count: number;
  percentage: number; // 0-100, sobre o total de encerrados
};

export type CancellationReasonBreakdown = {
  reason: string; // texto limpo ("Inadimplência", "Mudança de Endereço"...)
  category: string;
  count: number;
};

export type CancellationReasonsResponse = {
  // Total de casos ENCERRADOS considerados.
  totalClosed: number;
  // Quantos têm motivo identificado no ERP.
  withReason: number;
  byCategory: CancellationReasonCategoryBreakdown[];
  topReasons: CancellationReasonBreakdown[];
  // Todos os motivos (sem corte), para filtros e listas completas.
  allReasons: CancellationReasonBreakdown[];
  // CLOSED cujo contrato nao esta Cancelado no ERP (ficam fora do total).
  excludedNotCancelled: number;
};
