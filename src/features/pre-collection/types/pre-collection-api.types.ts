export type PreCollectionDistributeResult = {
  eligible: number;
  skipped: number;
  created: number;
  existing: number;
  distributed: number;
  agents: number;
};

export type PreCollectionItem = {
  contractExternalId: string | null;
  contractCode: string;
  customerName: string;
  customerDocument: string | null;
  customerPhone: string | null;
  firstOverdueDate: string;
  firstOverdueAmount: string;
  secondDueDate: string;
  secondDueAmount: string;
  daysUntilSecond: number;
  totalOpenAmount: string;
};

export type PreCollectionListResponse = {
  daysWindow: number;
  generatedAt: string | null;
  refreshing: boolean;
  total: number;
  items: PreCollectionItem[];
};
