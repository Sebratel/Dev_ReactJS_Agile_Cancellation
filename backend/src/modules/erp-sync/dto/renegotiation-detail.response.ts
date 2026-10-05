// Detalhe financeiro de uma renegociacao, buscado AO VIVO no ERP (sem o filtro
// renegotiated=false que o resto da plataforma usa). Serve a aba Renegociados
// da supervisao para mostrar os titulos renegociados e o acordo em aberto.
export type RenegotiationTitle = {
  invoiceNumber: string | null;
  nature: string | null;
  renegotiated: boolean;
  paid: boolean;
  titleAmount: string;
  balance: string;
  expiration: string | null;
};

export type RenegotiationDetailResponse = {
  // false quando o ERP nao esta configurado/acessivel — a UI mostra um aviso.
  available: boolean;
  // Titulos que foram renegociados (renegotiated=true) — a divida de origem.
  renegotiatedTitles: RenegotiationTitle[];
  // Titulos em aberto hoje (o novo acordo + eventuais mensalidades).
  openTitles: RenegotiationTitle[];
  openBalanceTotal: string;
};
