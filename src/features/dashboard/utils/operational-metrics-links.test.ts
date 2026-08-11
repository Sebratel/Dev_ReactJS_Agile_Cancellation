import { describe, expect, it } from 'vitest';
import {
  getOperationalMetricAriaLabel,
  getOperationalMetricHref,
} from '@/features/dashboard/utils/operational-metrics-links';

describe('operational metrics links', () => {
  it('mapeia SLA vencido para supervisao com slaStatus overdue', () => {
    expect(getOperationalMetricHref('overdueSlaCases')).toBe(
      '/supervisao?slaStatus=overdue',
    );
  });

  it('mapeia sem interacao para interactionStatus none', () => {
    expect(getOperationalMetricHref('casesWithoutInteraction')).toBe(
      '/supervisao?interactionStatus=none',
    );
  });

  it('mapeia promessas ativas para promiseStatus ACTIVE', () => {
    expect(getOperationalMetricHref('activePromises')).toBe(
      '/supervisao?promiseStatus=ACTIVE',
    );
  });

  it('nao gera link para metricas nao clicaveis', () => {
    expect(getOperationalMetricHref('fulfillmentRate')).toBeUndefined();
  });

  it('gera aria-label para cards clicaveis', () => {
    expect(getOperationalMetricAriaLabel('activePromises', 'Ativas')).toBe(
      'Ver supervisão filtrada por Ativas',
    );
  });
});
