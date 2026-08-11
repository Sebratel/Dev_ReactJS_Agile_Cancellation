export type CollectionAttemptResponse = {
  id: string;
  collectionCaseId: string;
  channel: string;
  result: string;
  attemptedAt: string;
  notes: string | null;
  nextContactAt: string | null;
  performedByUserId: string | null;
};
