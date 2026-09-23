import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SupervisionPortfolios } from '@/features/supervision/components/supervision-portfolios';
import { type CollectionCasePortfolioSummary } from '@/features/collection-cases/types/collection-cases-api.types';
import { type UserResponse } from '@/features/users/types/users-api.types';

const portfolios: CollectionCasePortfolioSummary[] = [
  {
    agent: { id: 'usr_marina', name: 'Marina Lopes', avatarUrl: null },
    totalActive: 12,
    totalAssigned: 30,
    interacted: 20,
    slaOverdue: 3,
    awaitingReply: 2,
    noManualInteraction: 5,
    totalOutstanding: '15000.00',
  },
  {
    agent: null,
    totalActive: 40,
    totalAssigned: 40,
    interacted: 0,
    slaOverdue: 0,
    awaitingReply: 0,
    noManualInteraction: 39,
    totalOutstanding: '80000.00',
  },
];

const agents: UserResponse[] = [
  {
    id: 'usr_marina',
    email: 'marina@ger.local',
    name: 'Marina Lopes',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['COLLECTION_AGENT'],
    lastLoginAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_carlos',
    email: 'carlos@ger.local',
    name: 'Carlos Nunes',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['COLLECTION_AGENT'],
    lastLoginAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('SupervisionPortfolios', () => {
  it('renderiza uma carteira por atendente, com a de "Sem responsável" em primeiro', () => {
    render(
      <SupervisionPortfolios
        portfolios={portfolios}
        agents={agents}
        isLoading={false}
        onSelectAgent={vi.fn()}
      />,
    );

    const cards = screen.getAllByRole('button', { name: /Ver casos de/ });
    // Marina + Carlos (mesclado, 0 casos) + Sem responsável = 3 carteiras.
    expect(cards).toHaveLength(3);
    // "Sem responsável" ordenado primeiro (exige acao da supervisao).
    expect(cards[0]).toHaveAccessibleName('Ver casos de Sem responsável');
  });

  it('inclui atendente sem casos ativos (carteira vazia = ocioso)', () => {
    render(
      <SupervisionPortfolios
        portfolios={portfolios}
        agents={agents}
        isLoading={false}
        onSelectAgent={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Ver casos de Carlos Nunes' }),
    ).toBeInTheDocument();
  });

  it('mostra os indicadores da carteira', () => {
    render(
      <SupervisionPortfolios
        portfolios={portfolios}
        agents={agents}
        isLoading={false}
        onSelectAgent={vi.fn()}
      />,
    );

    const marinaCard = screen.getByRole('button', {
      name: 'Ver casos de Marina Lopes',
    });
    // Card do atendente: total na carteira + ativos, e "Interagidos".
    expect(
      within(marinaCard).getByText(/30 casos na carteira/),
    ).toBeInTheDocument();
    expect(within(marinaCard).getByText('Interagidos')).toBeInTheDocument();
    expect(
      within(marinaCard).getByText('Aguardando resposta'),
    ).toBeInTheDocument();
    expect(within(marinaCard).getByText('Sem interação')).toBeInTheDocument();
    expect(within(marinaCard).getByText('Em aberto')).toBeInTheDocument();

    // Card "Sem responsável" mantém "SLA vencido".
    const unassignedCard = screen.getByRole('button', {
      name: 'Ver casos de Sem responsável',
    });
    expect(
      within(unassignedCard).getByText('SLA vencido'),
    ).toBeInTheDocument();
  });

  it('chama onSelectAgent com o id ao clicar; null para a carteira sem responsável', async () => {
    const user = userEvent.setup();
    const onSelectAgent = vi.fn();

    render(
      <SupervisionPortfolios
        portfolios={portfolios}
        agents={agents}
        isLoading={false}
        onSelectAgent={onSelectAgent}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Ver casos de Marina Lopes' }),
    );
    expect(onSelectAgent).toHaveBeenCalledWith('usr_marina');

    await user.click(
      screen.getByRole('button', { name: 'Ver casos de Sem responsável' }),
    );
    expect(onSelectAgent).toHaveBeenCalledWith(null);
  });
});
