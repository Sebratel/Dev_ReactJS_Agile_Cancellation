import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomersPage from '@/features/customers/pages/customers-page';
import { createMockSession } from '@/test/auth-test-utils';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/features/customers/services/customers.service', () => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
}));

import { getCustomers } from '@/features/customers/services/customers.service';

describe('CustomersPage', () => {
  it('lista clientes retornados pela API', async () => {
    vi.mocked(getCustomers).mockResolvedValue({
      items: [
        {
          id: 'cus_0001',
          name: 'Construtora Horizonte',
          document: '12.345.678/0001-90',
          email: 'financeiro@horizonte.com.br',
          phone: null,
          contractsCount: 1,
          openInvoicesCount: 1,
          totalOutstanding: '12890.55',
          overdueInvoicesCount: 1,
          overdueAmount: '12890.55',
          notDueAmount: '0.00',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderWithProviders(<CustomersPage />, {
      route: '/clientes',
      session: createMockSession(),
    });

    expect(
      await screen.findByText('Construtora Horizonte'),
    ).toBeInTheDocument();
    expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument();
  });

  it('mostra empty state quando nao ha clientes', async () => {
    vi.mocked(getCustomers).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderWithProviders(<CustomersPage />, {
      route: '/clientes',
      session: createMockSession(),
    });

    await waitFor(() => {
      expect(screen.getByText('Nenhum cliente encontrado')).toBeInTheDocument();
    });
  });
});
