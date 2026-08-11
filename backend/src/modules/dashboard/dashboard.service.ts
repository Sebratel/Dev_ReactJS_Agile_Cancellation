import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createApiResponse } from '@/common/responses/api-response';
import type { DashboardRepository } from '@/modules/dashboard/repositories/dashboard.repository';
import {
  resolveRecoveryRankingRange,
  type RecoveryRankingPeriod,
} from '@/modules/dashboard/utils/dashboard-ranking.utils';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  async getSummary() {
    const summary = await this.dashboardRepository.getSummary();

    return createApiResponse(summary);
  }

  async getOperations() {
    const operations = await this.dashboardRepository.getOperations();

    return createApiResponse(operations);
  }

  async getRecoveryRanking(period: RecoveryRankingPeriod = 'current_month') {
    const range = resolveRecoveryRankingRange(period, new Date());
    const ranking = await this.dashboardRepository.getRecoveryRanking(range);

    return createApiResponse(ranking);
  }
}
