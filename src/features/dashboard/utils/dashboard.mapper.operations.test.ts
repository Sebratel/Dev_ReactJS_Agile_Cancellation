import { describe, expect, it } from 'vitest';
import {
  isDashboardOperationsEmpty,
  mapDashboardOperationsToGroups,
} from '@/features/dashboard/utils/dashboard.mapper';
import { mockDashboardOperationsResponse } from '@/test/fixtures/api-fixtures';

describe('dashboard.mapper operations', () => {
  it('formata metricas operacionais', () => {
    const groups = mapDashboardOperationsToGroups(
      mockDashboardOperationsResponse,
    );

    expect(groups).toHaveLength(4);
    expect(groups[1]?.metrics[3]?.value).toBe('80,6%');
    expect(groups[3]?.metrics[0]?.value).toBe('R$ 184.750,42');
  });

  it('adiciona links de drill-down nas metricas clicaveis', () => {
    const groups = mapDashboardOperationsToGroups(
      mockDashboardOperationsResponse,
    );
    const collectionMetrics = groups[0]?.metrics ?? [];

    expect(
      collectionMetrics.find((metric) => metric.key === 'overdueSlaCases')
        ?.href,
    ).toBe('/supervisao?slaStatus=overdue');
    expect(
      collectionMetrics.find(
        (metric) => metric.key === 'casesWithoutInteraction',
      )?.href,
    ).toBe('/supervisao?interactionStatus=none');
    expect(
      groups[1]?.metrics.find((metric) => metric.key === 'activePromises')
        ?.href,
    ).toBe('/supervisao?promiseStatus=ACTIVE');
    expect(
      groups[1]?.metrics.find((metric) => metric.key === 'fulfillmentRate')
        ?.href,
    ).toBeUndefined();
  });

  it('identifica payload vazio', () => {
    expect(
      isDashboardOperationsEmpty({
        ...mockDashboardOperationsResponse,
        collection: {
          ...mockDashboardOperationsResponse.collection,
          activeCases: 0,
        },
        financial: {
          ...mockDashboardOperationsResponse.financial,
          outstandingAmount: '0.00',
        },
        cancellations: {
          ...mockDashboardOperationsResponse.cancellations,
          inProgress: 0,
          completed: 0,
        },
        promises: {
          ...mockDashboardOperationsResponse.promises,
          activePromises: 0,
        },
      }),
    ).toBe(true);
  });
});
