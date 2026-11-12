import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CriticalCasesTable } from '@/features/dashboard/components/critical-cases-table';
import { DashboardKpiGrid } from '@/features/dashboard/components/dashboard-kpi-grid';
import { OperationalAlerts } from '@/features/dashboard/components/operational-alerts';
import { OperationalSummary } from '@/features/dashboard/components/operational-summary';
import {
  type CriticalCase,
  type DashboardMetric,
  type OperationalAlert,
} from '@/features/dashboard/types/dashboard.types';
import { renderWithProviders } from '@/test/test-utils';

const criticalCase: CriticalCase = {
  id: 'case-1',
  customer: 'Construtora Horizonte',
  contract: 'CT-100',
  daysOverdue: 45,
  outstandingAmount: 1500.5,
  owner: 'Marina Souza',
  statusLabel: 'Em cobranca',
  statusVariant: 'warning',
  priorityLabel: 'Alta',
  priorityVariant: 'danger',
  slaLabel: 'Estourado',
  slaVariant: 'danger',
};

function buildAlert(
  overrides: Partial<OperationalAlert> = {},
): OperationalAlert {
  return {
    key: 'a1',
    title: 'SLA estourado',
    description: 'Casos fora do prazo',
    count: 12,
    variant: 'danger',
    ...overrides,
  };
}

describe('CriticalCasesTable', () => {
  it('renderiza os dados do caso e links para o detalhe e a supervisao', () => {
    renderWithProviders(<CriticalCasesTable cases={[criticalCase]} />);

    expect(screen.getByText('Construtora Horizonte')).toBeInTheDocument();
    expect(screen.getByText('CT-100')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/1\.500,50/)).toBeInTheDocument();
    expect(screen.getByText('Marina Souza')).toBeInTheDocument();
    expect(screen.getByText('Estourado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute(
      'href',
      '/supervisao/case-1',
    );
    expect(
      screen.getByRole('link', { name: 'Ver todos na supervisão' }),
    ).toHaveAttribute(
      'href',
      '/supervisao?sortBy=daysOverdue&sortDirection=desc',
    );
  });

  it('nao renderiza linhas quando a lista esta vazia', () => {
    renderWithProviders(<CriticalCasesTable cases={[]} />);

    expect(screen.queryByRole('link', { name: 'Ver detalhes' })).toBeNull();
  });
});

describe('OperationalAlerts', () => {
  it('mostra contagem padrao e link de revisao quando informado', () => {
    renderWithProviders(
      <OperationalAlerts
        alerts={[buildAlert({ supervisionHref: '/supervisao?sla=breached' })]}
      />,
    );

    expect(screen.getByText('SLA estourado')).toBeInTheDocument();
    expect(screen.getByText('12 casos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Revisar/ })).toHaveAttribute(
      'href',
      '/supervisao?sla=breached',
    );
  });

  it('prefere o aviso customizado e omite o link sem href', () => {
    renderWithProviders(
      <OperationalAlerts
        alerts={[
          buildAlert({ notice: 'Sincronizacao parada', variant: 'warning' }),
        ]}
      />,
    );

    expect(screen.getByText('Sincronizacao parada')).toBeInTheDocument();
    expect(screen.queryByText('12 casos')).toBeNull();
    expect(screen.queryByRole('link', { name: /Revisar/ })).toBeNull();
  });

  it('limita os itens por maxItems e informa quantos ficaram de fora', () => {
    const alerts = [
      buildAlert({ key: 'a1', title: 'Primeiro' }),
      buildAlert({ key: 'a2', title: 'Segundo' }),
      buildAlert({ key: 'a3', title: 'Terceiro' }),
    ];
    renderWithProviders(
      <OperationalAlerts alerts={alerts} maxItems={1} compact />,
    );

    expect(screen.getByText('Primeiro')).toBeInTheDocument();
    expect(screen.queryByText('Segundo')).toBeNull();
    expect(screen.getByText(/\+ 2 alertas/)).toBeInTheDocument();
  });
});

describe('OperationalSummary', () => {
  const items = [
    { label: 'Casos abertos', value: '120', helperText: 'No ciclo atual' },
  ];

  it('exibe o texto de apoio no modo padrao', () => {
    renderWithProviders(<OperationalSummary items={items} />);

    expect(screen.getByText('Casos abertos')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('No ciclo atual')).toBeInTheDocument();
  });

  it('oculta o texto de apoio no modo compacto', () => {
    renderWithProviders(<OperationalSummary items={items} compact />);

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.queryByText('No ciclo atual')).toBeNull();
  });
});

describe('DashboardKpiGrid', () => {
  function metric(key: DashboardMetric['key'], title: string): DashboardMetric {
    return {
      key,
      title,
      value: '10',
      description: `desc ${title}`,
      variant: 'neutral',
    };
  }

  it('separa metricas primarias das de fluxo operacional', () => {
    renderWithProviders(
      <DashboardKpiGrid
        metrics={[
          metric('openAmount', 'Valor em aberto'),
          metric('inCollection', 'Em cobranca'),
        ]}
      />,
    );

    const health = screen.getByRole('region', { name: 'Saúde da operação' });
    const flow = screen.getByRole('region', { name: 'Fluxo operacional' });
    expect(health).toHaveTextContent('Valor em aberto');
    expect(health).not.toHaveTextContent('Em cobranca');
    expect(flow).toHaveTextContent('Em cobranca');
  });
});
