import { describe, expect, it } from 'vitest';
import {
  mapDashboardOperationsToGroups,
  mapDashboardSummaryToAlerts,
  mapDashboardSummaryToStatusDistribution,
} from '@/features/dashboard/utils/dashboard.mapper';
import {
  mockDashboardOperationsResponse,
  mockDashboardSummaryResponse,
} from '@/test/fixtures/api-fixtures';

describe('indicadores honestos do dashboard', () => {
  it('SLA nao configurado vira aviso neutro, nao "0 casos" verde/vermelho', () => {
    const alerts = mapDashboardSummaryToAlerts({
      ...mockDashboardSummaryResponse,
      operationalAlerts: [
        {
          key: 'slaBreached',
          title: 'Casos com SLA vencido',
          description: 'x',
          count: 0,
          notice: 'SLA não configurado',
        },
      ],
    });

    expect(alerts[0]).toMatchObject({
      notice: 'SLA não configurado',
      variant: 'neutral',
    });
  });

  it('operacoes: SLA nao configurado mostra "Não configurado"', () => {
    const groups = mapDashboardOperationsToGroups({
      ...mockDashboardOperationsResponse,
      collection: {
        ...mockDashboardOperationsResponse.collection,
        overdueSlaCases: 0,
        slaConfigured: false,
      },
    });
    const sla = groups
      .flatMap((group) => group.metrics)
      .find((metric) => metric.key === 'overdueSlaCases');

    expect(sla?.value).toBe('Não configurado');
    expect(sla?.variant).toBe('neutral');
  });

  it('distribuicao preserva o grupo carteira x historico', () => {
    const items = mapDashboardSummaryToStatusDistribution({
      ...mockDashboardSummaryResponse,
      statusDistribution: [
        {
          status: 'WAITING_TRIAGE',
          label: 'Aguardando triagem',
          count: 589,
          group: 'portfolio',
        },
        { status: 'CLOSED', label: 'Encerrado', count: 2091, group: 'history' },
      ],
    });

    expect(items.map((item) => item.group)).toEqual(['portfolio', 'history']);
  });
});
