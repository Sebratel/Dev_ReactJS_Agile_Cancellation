export type DashboardRecoveryRankingItem = {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  recoveredAmount: string;
  recoveredCases: number;
};

export type DashboardRecoveryRankingResponse = {
  periodFrom: string;
  periodTo: string;
  totalRecoveredAmount: string;
  totalRecoveredCases: number;
  ranking: DashboardRecoveryRankingItem[];
};
