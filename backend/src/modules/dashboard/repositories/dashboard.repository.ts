import type { DashboardOperationsResponse } from '@/modules/dashboard/dto/dashboard-operations.response';
import type { DashboardRecoveryRankingResponse } from '@/modules/dashboard/dto/dashboard-ranking.response';
import type { DashboardSummaryResponse } from '@/modules/dashboard/dto/dashboard-summary.response';
import type { RecoveryRankingRange } from '@/modules/dashboard/utils/dashboard-ranking.utils';

export type RecoveryRankingParams = RecoveryRankingRange;

export interface DashboardRepository {
  getSummary(): Promise<DashboardSummaryResponse>;
  getOperations(): Promise<DashboardOperationsResponse>;
  getRecoveryRanking(
    params: RecoveryRankingParams,
  ): Promise<DashboardRecoveryRankingResponse>;
}
