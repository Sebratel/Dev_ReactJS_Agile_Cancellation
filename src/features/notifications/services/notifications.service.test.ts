import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/features/notifications/services/notifications.service';

const { request } = vi.hoisted(() => ({
  request:
    vi.fn<
      (arg: {
        path: string;
        method?: string;
        body?: string;
      }) => Promise<unknown>
    >(),
}));

vi.mock('@/services/api/http-client', () => ({
  httpClient: { request },
}));

describe('notifications.service', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { count: 3 } });
  });

  it('lista sem filtros usando o caminho base', async () => {
    await getNotifications();

    expect(request).toHaveBeenCalledWith({
      path: '/notifications',
      method: 'GET',
    });
  });

  it('lista apenas nao lidas com paginacao', async () => {
    await getNotifications({ unreadOnly: true, page: 2, limit: 5 });

    expect(request.mock.calls[0]?.[0].path).toBe(
      '/notifications?unreadOnly=true&page=2&limit=5',
    );
  });

  it('busca a contagem de nao lidas', async () => {
    const result = await getUnreadNotificationsCount();

    expect(request.mock.calls[0]?.[0].path).toBe('/notifications/unread-count');
    expect(result).toEqual({ count: 3 });
  });

  it('marca uma notificacao como lida via PATCH', async () => {
    await markNotificationAsRead('n1');

    expect(request).toHaveBeenCalledWith({
      path: '/notifications/n1/read',
      method: 'PATCH',
    });
  });

  it('marca todas como lidas via PATCH', async () => {
    const result = await markAllNotificationsAsRead();

    expect(request).toHaveBeenCalledWith({
      path: '/notifications/read-all',
      method: 'PATCH',
    });
    expect(result).toEqual({ count: 3 });
  });
});
