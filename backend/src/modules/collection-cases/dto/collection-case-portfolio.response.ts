export type CollectionCasePortfolioAgentSummary = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type CollectionCasePortfolioSummary = {
  // null representa a carteira "Sem responsavel" (casos ativos nao atribuidos).
  agent: CollectionCasePortfolioAgentSummary | null;
  totalActive: number;
  // Casos ATIVOS atribuidos ao atendente (mesma base de totalActive) — a
  // carteira do anel "contatados/carteira". Mantido separado de totalActive
  // por compatibilidade do contrato.
  totalAssigned: number;
  // Casos ativos com contato manual (tentativa nao-automatica) dentro do ciclo
  // atual (attemptedAt >= cycleStartedAt) — "quantos ele ja trabalhou".
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
