import { type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCollectionCasePortfolios } from '@/features/collection-cases/hooks/use-collection-case-portfolios';
import { useDashboardSummary } from '@/features/dashboard/hooks/use-dashboard-summary';
import { AUTO_REFRESH_INTERVAL_MS } from '@/services/api/auto-refresh';

vi.mock('@/features/collection-cases/services/collection-cases.service', () => ({
  getCollectionCasePortfolios: vi.fn().mockResolvedValue({ portfolios: [] }),
}));
vi.mock('@/features/dashboard/services/dashboard.service', () => ({
  getDashboardSummary: vi.fn().mockResolvedValue({}),
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function observerOptions(queryClient: QueryClient) {
  const [query] = queryClient.getQueryCache().getAll();
  return query?.observers[0]?.options;
}

describe('auto-refresh das telas operacionais', () => {
  it('carteiras revalidam a cada 60s e ao voltar o foco, so com aba visivel', async () => {
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useCollectionCasePortfolios(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const options = observerOptions(queryClient);
    expect(options?.refetchInterval).toBe(AUTO_REFRESH_INTERVAL_MS);
    expect(options?.refetchOnWindowFocus).toBe(true);
    expect(options?.refetchIntervalInBackground).toBeFalsy();
  });

  it('resumo do dashboard revalida a cada 60s e ao voltar o foco', async () => {
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const options = observerOptions(queryClient);
    expect(options?.refetchInterval).toBe(AUTO_REFRESH_INTERVAL_MS);
    expect(options?.refetchOnWindowFocus).toBe(true);
  });
});
