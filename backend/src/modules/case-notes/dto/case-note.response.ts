export type CaseNoteResponse = {
  id: string;
  collectionCaseId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  } | null;
};
