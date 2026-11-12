import { type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCancellationReasons } from '@/features/dashboard/hooks/use-cancellation-reasons';
import {
  useIntegrationEvents,
  useIntegrationEventsSummary,
  useSyncHealth,
} from '@/features/integrations/hooks/use-integration-events';
import { useMarkAllNotificationsAsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
import { useMarkNotificationAsRead } from '@/features/notifications/hooks/use-mark-notification-read';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-notifications-count';
import { usePaymentPromises } from '@/features/payment-promises/hooks/use-payment-promises';
import { usePaymentPromisesSummary } from '@/features/payment-promises/hooks/use-payment-promises-summary';
import {
  useDistributePreCollection,
  usePreCollection,
} from '@/features/pre-collection/hooks/use-pre-collection';
import { useRecoveryRanking } from '@/features/ranking/hooks/use-recovery-ranking';
import {
  useCustomer,
  useCustomers,
} from '@/features/customers/hooks/use-customers';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@/features/settings/hooks/use-update-settings';
import { useRenegotiationDetail } from '@/features/collection-cases/hooks/use-renegotiation-detail';
import { useCaseNotes } from '@/features/collection-cases/hooks/use-case-notes';
import * as dashboardService from '@/features/dashboard/services/dashboard.service';
import * as eventsService from '@/features/integrations/services/integration-events.service';
import * as notificationsService from '@/features/notifications/services/notifications.service';
import * as promisesService from '@/features/payment-promises/services/payment-promises.service';
import * as preCollectionService from '@/features/pre-collection/services/pre-collection.service';
import * as rankingService from '@/features/ranking/services/ranking.service';
import * as customersService from '@/features/customers/services/customers.service';
import * as settingsService from '@/features/settings/services/settings.service';
import * as casesService from '@/features/collection-cases/services/collection-cases.service';
import * as caseNotesService from '@/features/collection-cases/services/case-notes.service';

vi.mock('@/features/dashboard/services/dashboard.service', () => ({
  getCancellationReasons: vi.fn(),
}));
vi.mock('@/features/integrations/services/integration-events.service', () => ({
  getIntegrationEvents: vi.fn(),
  getIntegrationEventsSummary: vi.fn(),
  getSyncHealth: vi.fn(),
}));
vi.mock('@/features/notifications/services/notifications.service', () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationsCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));
vi.mock(
  '@/features/payment-promises/services/payment-promises.service',
  () => ({
    getPaymentPromises: vi.fn(),
    getPaymentPromisesSummary: vi.fn(),
  }),
);
vi.mock('@/features/pre-collection/services/pre-collection.service', () => ({
  getPreCollection: vi.fn(),
  distributePreCollection: vi.fn(),
}));
vi.mock('@/features/ranking/services/ranking.service', () => ({
  getRecoveryRanking: vi.fn(),
}));
vi.mock('@/features/customers/services/customers.service', () => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
}));
vi.mock('@/features/settings/services/settings.service', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));
vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getRenegotiationDetail: vi.fn(),
  }),
);
vi.mock('@/features/collection-cases/services/case-notes.service', () => ({
  getCaseNotes: vi.fn(),
}));

function setup<T>(useHook: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(useHook, { wrapper }), queryClient, invalidate };
}

describe('hooks de consulta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCancellationReasons expoe os dados do servico', async () => {
    vi.mocked(dashboardService.getCancellationReasons).mockResolvedValue({
      v: 1,
    } as never);
    const { result } = setup(() => useCancellationReasons());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ v: 1 });
  });

  it('useIntegrationEvents separa enabled dos filtros e respeita enabled=false', async () => {
    vi.mocked(eventsService.getIntegrationEvents).mockResolvedValue({
      items: [],
    } as never);
    const { result } = setup(() =>
      useIntegrationEvents({ page: 2, enabled: true }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsService.getIntegrationEvents).toHaveBeenCalledWith({
      page: 2,
    });

    vi.mocked(eventsService.getIntegrationEvents).mockClear();
    const disabled = setup(() => useIntegrationEvents({ enabled: false }));
    expect(disabled.result.current.fetchStatus).toBe('idle');
    expect(eventsService.getIntegrationEvents).not.toHaveBeenCalled();
  });

  it('useIntegrationEventsSummary e useSyncHealth buscam seus servicos', async () => {
    vi.mocked(eventsService.getIntegrationEventsSummary).mockResolvedValue({
      s: 1,
    } as never);
    vi.mocked(eventsService.getSyncHealth).mockResolvedValue({
      h: 1,
    } as never);
    const summary = setup(() => useIntegrationEventsSummary());
    const health = setup(() => useSyncHealth());
    const idle = setup(() => useSyncHealth(false));

    await waitFor(() => expect(summary.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(health.result.current.isSuccess).toBe(true));
    expect(summary.result.current.data).toEqual({ s: 1 });
    expect(health.result.current.data).toEqual({ h: 1 });
    expect(idle.result.current.fetchStatus).toBe('idle');
  });

  it('useNotifications usa params padrao vazios e useUnreadNotificationsCount le a contagem', async () => {
    vi.mocked(notificationsService.getNotifications).mockResolvedValue({
      items: [],
    } as never);
    vi.mocked(
      notificationsService.getUnreadNotificationsCount,
    ).mockResolvedValue({ count: 4 });
    const list = setup(() => useNotifications());
    const count = setup(() => useUnreadNotificationsCount());

    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(count.result.current.isSuccess).toBe(true));
    expect(notificationsService.getNotifications).toHaveBeenCalledWith({});
    expect(count.result.current.data).toEqual({ count: 4 });
  });

  it('useMarkNotificationAsRead e useMarkAllNotificationsAsRead invalidam notificacoes', async () => {
    vi.mocked(notificationsService.markNotificationAsRead).mockResolvedValue(
      {} as never,
    );
    vi.mocked(
      notificationsService.markAllNotificationsAsRead,
    ).mockResolvedValue({ count: 2 });
    const one = setup(() => useMarkNotificationAsRead());
    const all = setup(() => useMarkAllNotificationsAsRead());

    await act(async () => {
      await one.result.current.mutateAsync('n1');
      await all.result.current.mutateAsync();
    });

    expect(notificationsService.markNotificationAsRead).toHaveBeenCalledWith(
      'n1',
    );
    expect(notificationsService.markAllNotificationsAsRead).toHaveBeenCalled();
    await waitFor(() => expect(one.invalidate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(all.invalidate).toHaveBeenCalledTimes(1));
  });

  it('usePaymentPromises respeita enabled e usePaymentPromisesSummary busca o resumo', async () => {
    vi.mocked(promisesService.getPaymentPromises).mockResolvedValue({
      items: [],
    } as never);
    vi.mocked(promisesService.getPaymentPromisesSummary).mockResolvedValue({
      t: 1,
    } as never);
    const list = setup(() => usePaymentPromises({ page: 3 }));
    const off = setup(() => usePaymentPromises({ enabled: false }));
    const summary = setup(() => usePaymentPromisesSummary());

    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(summary.result.current.isSuccess).toBe(true));
    expect(promisesService.getPaymentPromises).toHaveBeenCalledTimes(1);
    expect(promisesService.getPaymentPromises).toHaveBeenCalledWith({
      page: 3,
    });
    expect(off.result.current.fetchStatus).toBe('idle');
  });

  it('usePreCollection busca a janela de dias informada', async () => {
    vi.mocked(preCollectionService.getPreCollection).mockResolvedValue({
      refreshing: false,
    } as never);
    const { result } = setup(() => usePreCollection(7));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(preCollectionService.getPreCollection).toHaveBeenCalledWith(7);
  });

  it('useDistributePreCollection distribui e invalida os casos', async () => {
    vi.mocked(preCollectionService.distributePreCollection).mockResolvedValue({
      created: 1,
    } as never);
    const { result, invalidate } = setup(() => useDistributePreCollection());

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(preCollectionService.distributePreCollection).toHaveBeenCalled();
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
  });

  it('useRecoveryRanking busca o ranking do periodo', async () => {
    vi.mocked(rankingService.getRecoveryRanking).mockResolvedValue({
      r: 1,
    } as never);
    const { result } = setup(() =>
      useRecoveryRanking('month' as Parameters<typeof useRecoveryRanking>[0]),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rankingService.getRecoveryRanking).toHaveBeenCalledWith('month');
  });

  it('useCustomers aplica defaults de paginacao e useCustomer so busca com id', async () => {
    vi.mocked(customersService.getCustomers).mockResolvedValue({
      items: [],
    } as never);
    vi.mocked(customersService.getCustomerById).mockResolvedValue({
      id: 'c1',
    } as never);
    const list = setup(() => useCustomers({ search: 'ana' }));
    const detail = setup(() => useCustomer('c1'));
    const empty = setup(() => useCustomer(''));

    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(customersService.getCustomers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: 'ana',
      sortBy: undefined,
      sortDirection: undefined,
    });
    expect(customersService.getCustomerById).toHaveBeenCalledWith('c1');
    expect(empty.result.current.fetchStatus).toBe('idle');
  });

  it('useSettings le as configuracoes e useUpdateSettings atualiza o cache', async () => {
    const stored = { slaHours: 4 } as never;
    vi.mocked(settingsService.getSettings).mockResolvedValue(stored);
    vi.mocked(settingsService.updateSettings).mockResolvedValue({
      slaHours: 8,
    } as never);
    const { result, queryClient } = setup(() => ({
      query: useSettings(),
      update: useUpdateSettings(),
    }));

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toEqual({ slaHours: 4 });

    await act(async () => {
      await result.current.update.mutateAsync({ slaHours: 8 } as never);
    });

    expect(queryClient.getQueryData(['settings'])).toBeDefined();
  });

  it('useRenegotiationDetail nao busca sem contrato e busca quando informado', async () => {
    vi.mocked(casesService.getRenegotiationDetail).mockResolvedValue({
      d: 1,
    } as never);
    const none = setup(() => useRenegotiationDetail(null));
    const off = setup(() => useRenegotiationDetail('x1', false));
    const on = setup(() => useRenegotiationDetail('x1'));

    await waitFor(() => expect(on.result.current.isSuccess).toBe(true));
    expect(none.result.current.fetchStatus).toBe('idle');
    expect(off.result.current.fetchStatus).toBe('idle');
    expect(casesService.getRenegotiationDetail).toHaveBeenCalledTimes(1);
    expect(casesService.getRenegotiationDetail).toHaveBeenCalledWith('x1');
  });

  it('useCaseNotes so busca quando ha caseId', async () => {
    vi.mocked(caseNotesService.getCaseNotes).mockResolvedValue([] as never);
    const none = setup(() => useCaseNotes(''));
    const on = setup(() => useCaseNotes('k1'));

    await waitFor(() => expect(on.result.current.isSuccess).toBe(true));
    expect(none.result.current.fetchStatus).toBe('idle');
    expect(caseNotesService.getCaseNotes).toHaveBeenCalledWith('k1');
  });
});
