import { CollectionStatus } from '@prisma/client';

// Casos que já geraram crédito no ranking (recuperado ou pago). O crédito vai
// para a atendente responsável, então reatribuir o caso moveria a premiação de
// uma pessoa para outra. Por isso a reatribuição é recusada.
export const CREDIT_LOCKED_CASE_STATUSES: CollectionStatus[] = [
  CollectionStatus.RECOVERED,
  CollectionStatus.PAYMENT_MADE,
];

export const CREDIT_LOCKED_MESSAGE =
  'Caso recuperado ou com pagamento realizado não pode ser reatribuído: o crédito da recuperação fica com a atendente que fez o contato.';
