// Cliente na iminencia de vencer a 2a mensalidade: tem 1 titulo vencido e outro
// prestes a vencer dentro da janela. NAO e um caso de cobranca — e uma visao
// preventiva, direta do ERP, para o time agir antes de o cliente entrar na esteira.
export type PreCollectionItemResponse = {
  contractExternalId: string | null;
  contractCode: string;
  customerName: string;
  customerDocument: string | null;
  customerPhone: string | null;
  firstOverdueDate: string; // data do titulo ja vencido (YYYY-MM-DD)
  firstOverdueAmount: string;
  secondDueDate: string; // data do titulo prestes a vencer (YYYY-MM-DD)
  secondDueAmount: string;
  daysUntilSecond: number; // dias ate o 2o vencer (>= 0)
  totalOpenAmount: string; // soma dos dois titulos em aberto
};

export type PreCollectionListResponse = {
  daysWindow: number;
  // Momento do snapshot em cache (null enquanto o primeiro carregamento roda).
  generatedAt: string | null;
  // true quando o snapshot ainda esta sendo montado em background.
  refreshing: boolean;
  total: number;
  items: PreCollectionItemResponse[];
};
