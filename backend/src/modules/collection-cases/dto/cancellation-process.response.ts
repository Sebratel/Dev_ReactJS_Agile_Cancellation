export type CancellationProcessResponse = {
  id: string;
  collectionCaseId: string;
  status: string;
  reason: string;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};
