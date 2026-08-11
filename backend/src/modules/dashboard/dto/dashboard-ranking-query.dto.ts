import { IsIn, IsOptional } from 'class-validator';
import {
  RECOVERY_RANKING_PERIODS,
  type RecoveryRankingPeriod,
} from '@/modules/dashboard/utils/dashboard-ranking.utils';

export class DashboardRankingQueryDto {
  @IsOptional()
  @IsIn(RECOVERY_RANKING_PERIODS)
  period?: RecoveryRankingPeriod;
}
