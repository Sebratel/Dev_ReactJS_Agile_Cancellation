import { Injectable } from '@nestjs/common';
import type { DashboardRecoveryRankingResponse } from '@/modules/dashboard/dto/dashboard-ranking.response';
import type {
  DashboardRepository,
  RecoveryRankingParams,
} from '@/modules/dashboard/repositories/dashboard.repository';
import {
  mockDashboardOperations,
  mockDashboardSummary,
  mockRecoveryRanking,
} from '@/modules/dashboard/mocks/dashboard.mock';

@Injectable()
export class DashboardMockRepository implements DashboardRepository {
  getSummary() {
    return Promise.resolve(mockDashboardSummary);
  }

  getOperations() {
    return Promise.resolve(mockDashboardOperations);
  }

  getRecoveryRanking({
    from,
    to,
  }: RecoveryRankingParams): Promise<DashboardRecoveryRankingResponse> {
    const totalRecoveredAmount = mockRecoveryRanking.reduce(
      (total, item) => total + Number(item.recoveredAmount),
      0,
    );
    const totalRecoveredCases = mockRecoveryRanking.reduce(
      (total, item) => total + item.recoveredCases,
      0,
    );

    return Promise.resolve({
      periodFrom: from.toISOString(),
      periodTo: to.toISOString(),
      totalRecoveredAmount: totalRecoveredAmount.toFixed(2),
      totalRecoveredCases,
      ranking: mockRecoveryRanking,
    });
  }

  getCancellationReasons() {
    return Promise.resolve({
      totalClosed: 0,
      withReason: 0,
      byCategory: [
        {
          category: 'INADIMPLENCIA',
          label: 'Inadimplência',
          count: 0,
          percentage: 0,
        },
        {
          category: 'EXTERNO',
          label: 'Motivo externo',
          count: 0,
          percentage: 0,
        },
        {
          category: 'OUTRO',
          label: 'Outro / não informado',
          count: 0,
          percentage: 0,
        },
      ],
      topReasons: [],
      allReasons: [],
      excludedNotCancelled: 0,
    });
  }
}
