import { Route, Routes, useLocation } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentPromisesPage from '@/features/payment-promises/pages/payment-promises-page';
import { type PaymentPromiseListItemResponse } from '@/features/payment-promises/types/payment-promises-api.types';
import { createMockSession } from '@/test/auth-test-utils';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/payment-promises/services/payment-promises.service',
  () => ({
    getPaymentPromises: vi.fn(),
    getPaymentPromisesSummary: vi.fn(),
  }),
);

import {
  getPaymentPromises,
  getPaymentPromisesSummary,
} from '@/features/payment-promises/services/payment-promises.service';

function promise(
  overrides: Partial<PaymentPromiseListItemResponse>,
): PaymentPromiseListItemResponse {
  return {
    id: 'p1',
    collectionCaseId: 'c1',
    status: 'ACTIVE',
    promisedAmount: '199.80',
    promisedDate: '2026-10-01T00:00:00.000Z',
    notes: null,
    fulfilledAt: null,
    brokenAt: null,
    cancelledAt: null,
    createdAt: '2026-09-20T00:00:00.000Z',
    isOverdue: true,
    caseStatus: 'IN_COLLECTION',
    caseRecoveredAt: null,
    customer: { id: 'cus1', name: 'ACME LTDA', document: '123' },
    contract: { id: 'ctr1', code: 'CTR-1', status: 'ACTIVE' },
    assignedTo: { id: 'u1', name: 'Debora' },
    ...overrides,
  };
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderPage() {
  renderWithProviders(
    <Routes>
      <Route
        path="/promessas"
        element={
          <>
            <PaymentPromisesPage />
            <LocationDisplay />
          </>
        }
      />
    </Routes>,
    { route: '/promessas', session: createMockSession() },
  );
}

describe('PaymentPromisesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPaymentPromises).mockResolvedValue({
      items: [
        promise({}),
        promise({
          id: 'p2',
          collectionCaseId: 'c2',
          customer: { id: 'cus2', name: 'BETA SA', document: '456' },
          caseStatus: 'RECOVERED',
          caseRecoveredAt: '2026-10-05T12:00:00.000Z',
        }),
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });
    vi.mocked(getPaymentPromisesSummary).mockResolvedValue({
      active: 5,
      overdue: 4,
      overduePaid: 1,
      fulfilledThisMonth: 2,
      brokenThisMonth: 1,
    });
  });

  it('mostra a situacao do caso de cada promessa e quantas vencidas ja pagaram', async () => {
    renderPage();

    expect(await screen.findByText('ACME LTDA')).toBeInTheDocument();
    expect(screen.getByText('Retido')).toBeInTheDocument();
    expect(screen.getByText('Em cobrança')).toBeInTheDocument();
    expect(screen.getByText(/em 05\/10\/2026/)).toBeInTheDocument();
    expect(await screen.findByText(/1 já pagaram/)).toBeInTheDocument();
  });

  it('filtra pela situacao do caso e leva o filtro para a URL', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('ACME LTDA');
    await user.selectOptions(screen.getByLabelText('Situação do caso'), 'PAID');

    await waitFor(() => {
      expect(getPaymentPromises).toHaveBeenCalledWith(
        expect.objectContaining({ caseSituation: 'PAID' }),
      );
    });
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      'caseSituation=PAID',
    );
  });
});
