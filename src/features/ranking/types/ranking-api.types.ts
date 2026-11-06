export type RecoveryRankingPeriod =
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'all';

export type RecoveryRankingItem = {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  recoveredAmount: string;
  recoveredCases: number;
};

export type RecoveryRankingResponse = {
  periodFrom: string;
  periodTo: string;
  totalRecoveredAmount: string;
  totalRecoveredCases: number;
  ranking: RecoveryRankingItem[];
};
