import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AppSidebarDesktop } from '@/components/navigation/app-sidebar';
import { createMockSession } from '@/test/auth-test-utils';
import { renderWithProviders } from '@/test/test-utils';

describe('AppSidebarDesktop', () => {
  it('renderiza itens principais e identifica rota ativa', async () => {
    renderWithProviders(<AppSidebarDesktop />, {
      route: '/dashboard',
      session: createMockSession(),
    });

    expect(
      await screen.findByRole('link', { name: /Visão geral/i }),
    ).toHaveClass('bg-primary/10');
    expect(
      screen.getByRole('link', { name: /Supervisão/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Auditoria/i }),
    ).toBeInTheDocument();
  });
});
