export type CollectionCasePortfolioAgentSummary = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type CollectionCasePortfolioSummary = {
  // null representa a carteira "Sem responsavel" (casos ativos nao atribuidos).
  agent: CollectionCasePortfolioAgentSummary | null;
  totalActive: number;
  // Total de casos atribuidos ao atendente em QUALQUER status (inclui
  // Recuperados/Pagos que seguem vinculados a ele) — "quantos ele tem".
  totalAssigned: number;
  // Casos atribuidos que tiveram ao menos um contato manual do atendente
  // (tentativa nao-automatica) — "quantos ele interagiu".
  interacted: number;
  slaOverdue: number;
  awaitingReply: number;
  // Casos ativos sem nenhuma tentativa manual do atendente (apenas a
  // tentativa automatica inicial existe) — o que ainda nao foi trabalhado.
  noManualInteraction: number;
  totalOutstanding: string;
};

export type CollectionCasePortfoliosResponse = {
  portfolios: CollectionCasePortfolioSummary[];
};
