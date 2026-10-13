// Resumo leve das renegociacoes EM ABERTO (mesma fonte da aba Renegociados),
// para o card da visao geral. available=false => ERP indisponivel (a tela
// mostra "indisponivel", nunca 0).
export type RenegotiationSummaryResponse = {
  available: boolean;
  count: number;
  openAmount: string;
};
