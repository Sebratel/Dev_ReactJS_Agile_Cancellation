import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppSidebarDesktop } from '@/components/navigation/app-sidebar';
import { renderWithProviders } from '@/test/test-utils';
import { createMockSession } from '@/test/auth-test-utils';
import { type UserRole } from '@/types/auth';

type SidebarAssertion = {
  role: UserRole;
  visible: string[];
  hidden: string[];
};

// Only routes with ready:true appear in the sidebar.
// Promessas, Relatórios and Configurações are now active features.
const assertions: SidebarAssertion[] = [
  {
    role: 'ADMIN',
    visible: [
      'Visão geral',
      'Supervisão',
      'Clientes',
      'Cobrança',
      'Promessas',
      'Cancelamentos',
      'Ranking de recuperação',
      'Relatórios',
      'Auditoria',
      'Usuários',
      'Configurações',
    ],
    // Minha cobranca e a fila pessoal do atendente; ADMIN usa a Supervisao.
    hidden: ['Minha cobrança'],
  },
  {
    role: 'SUPERVISOR',
    visible: [
      'Visão geral',
      'Supervisão',
      'Clientes',
      'Cobrança',
      'Promessas',
      'Cancelamentos',
      'Ranking de recuperação',
      'Relatórios',
      'Auditoria',
    ],
    hidden: ['Minha cobrança', 'Usuários', 'Configurações'],
  },
  {
    role: 'COLLECTION_AGENT',
    visible: ['Visão geral', 'Minha cobrança'],
    hidden: [
      'Supervisão',
      'Cobrança',
      'Promessas',
      'Cancelamentos',
      'Ranking de recuperação',
    ],
  },
  {
    role: 'CANCELLATION_AGENT',
    visible: ['Visão geral', 'Cancelamentos'],
    hidden: [
      'Minha cobrança',
      'Cobrança',
      'Supervisão',
      'Ranking de recuperação',
    ],
  },
  {
    role: 'VIEWER',
    visible: ['Visão geral'],
    hidden: [
      'Supervisão',
      'Minha cobrança',
      'Cobrança',
      'Cancelamentos',
      'Auditoria',
      'Ranking de recuperação',
    ],
  },
];

describe('AppSidebar por perfil', () => {
  it.each(assertions)(
    'mostra menus corretos para $role',
    async ({ role, visible, hidden }) => {
      renderWithProviders(<AppSidebarDesktop />, {
        route: '/dashboard',
        session: createMockSession({
          user: {
            id: `role-${role}`,
            name: role,
            email: `${role.toLowerCase()}@ger.local`,
            roles: [role],
            role,
          },
        }),
      });

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: visible[0] }),
        ).toBeInTheDocument();
      });

      visible.forEach((label) => {
        expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
      });

      hidden.forEach((label) => {
        expect(
          screen.queryByRole('link', { name: label }),
        ).not.toBeInTheDocument();
      });
    },
  );
});
