import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UsersPage from '@/features/users/pages/users-page';
import { createMockSession } from '@/test/auth-test-utils';
import { renderWithProviders } from '@/test/test-utils';
import { type UserResponse } from '@/features/users/types/users-api.types';

vi.mock('@/features/users/services/users.service', () => ({
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

import { getUsers } from '@/features/users/services/users.service';

const mockUsers: UserResponse[] = [
  {
    id: 'user-admin',
    email: 'admin@ger.local',
    name: 'Ana Martins',
    status: 'ACTIVE',
    roles: ['ADMIN'],
    lastLoginAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('UsersPage', () => {
  it('lista usuarios retornados pela API', async () => {
    vi.mocked(getUsers).mockResolvedValue({
      items: mockUsers,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderWithProviders(<UsersPage />, {
      route: '/usuarios',
      session: createMockSession(),
    });

    expect(await screen.findByText('Ana Martins')).toBeInTheDocument();
    expect(screen.getByText('admin@ger.local')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('mostra empty state quando nao ha usuarios', async () => {
    vi.mocked(getUsers).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderWithProviders(<UsersPage />, {
      route: '/usuarios',
      session: createMockSession(),
    });

    await waitFor(() => {
      expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument();
    });
  });
});
