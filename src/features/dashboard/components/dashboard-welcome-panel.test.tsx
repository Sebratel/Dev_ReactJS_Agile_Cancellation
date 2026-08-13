import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardWelcomePanel } from '@/features/dashboard/components/dashboard-welcome-panel';
import { mockDashboardSummaryResponse } from '@/test/fixtures/api-fixtures';
import { type AuthUser } from '@/types/auth';

function renderPanel(user: AuthUser) {
  return render(
    <MemoryRouter>
      <DashboardWelcomePanel user={user} summary={mockDashboardSummaryResponse} />
    </MemoryRouter>,
  );
}

describe('DashboardWelcomePanel', () => {
  it('mostra briefing operacional para supervisor', () => {
    renderPanel({
      id: 'supervisor-user',
      name: 'Bruno Soares',
      email: 'bruno@sebratel.com.br',
      roles: ['SUPERVISOR'],
      role: 'SUPERVISOR',
    });

    expect(screen.getByText('Briefing da operação')).toBeInTheDocument();
    expect(screen.getByText('O que fazer agora')).toBeInTheDocument();
    expect(screen.getByText('Abrir casos prioritários')).toHaveAttribute(
      'href',
      '/supervisao',
    );
  });

  it('mostra rotina individual para agente de cobrança', () => {
    renderPanel({
      id: 'agent-user',
      name: 'Marina Lopes',
      email: 'marina@sebratel.com.br',
      roles: ['COLLECTION_AGENT'],
      role: 'COLLECTION_AGENT',
    });

    expect(screen.getByText('Minha rotina')).toBeInTheDocument();
    expect(screen.getByText('Minha carteira')).toBeInTheDocument();
    expect(screen.getByText('Seu foco agora')).toBeInTheDocument();
    expect(screen.getByText('Ver minha fila')).toHaveAttribute(
      'href',
      '/minha-cobranca',
    );
  });
});
