// Atualizacao automatica das telas operacionais (carteiras, dashboard,
// supervisao). Sem `refetchIntervalInBackground`, o polling pausa com a aba
// oculta; ao voltar o foco o dado e revalidado. Nao altera o default global
// do QueryProvider (staleTime 60s, sem refetch no foco).
export const AUTO_REFRESH_INTERVAL_MS = 60_000;

export const autoRefreshOptions = {
  refetchInterval: AUTO_REFRESH_INTERVAL_MS,
  refetchOnWindowFocus: true,
} as const;
