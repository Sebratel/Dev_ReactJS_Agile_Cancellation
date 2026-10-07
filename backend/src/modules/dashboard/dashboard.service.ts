import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createApiResponse } from '@/common/responses/api-response';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
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

  async getSummary(user: AuthenticatedUser) {
    const canSeeFullPortfolio = user.roles.some(
      (role) => role === 'ADMIN' || role === 'SUPERVISOR',
    );
    const summary = await this.dashboardRepository.getSummary(
      canSeeFullPortfolio ? undefined : { assignedUserId: user.id },
    );

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

  async getCancellationReasons() {
    const report = await this.dashboardRepository.getCancellationReasons();

    return createApiResponse(report);
  }
}
