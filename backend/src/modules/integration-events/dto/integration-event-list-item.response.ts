export type IntegrationEventListItemResponse = {
  id: string;
  source: string;
  eventType: string;
  externalId: string | null;
  status: string;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  payloadSize: number;
};

export type IntegrationEventsSummaryResponse = {
  pending: number;
  processing: number;
  failed: number;
  completedToday: number;
};

// Sinais de frescor da base para a supervisao "bater o olho": prova que o
// job de sync esta vivo (lastErpSyncAt) e mede a entrada real de casos novos.
export type SyncHealthResponse = {
  lastErpSyncAt: string | null;
  lastIngestEventAt: string | null;
  lastNewCaseAt: string | null;
  newCasesLast24h: number;
  newCasesLast7d: number;
};
