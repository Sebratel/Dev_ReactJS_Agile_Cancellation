import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import { MOCK_AUTH_USER_DEFINITIONS } from '@/modules/auth/mocks/mock-auth-users';
import type { NotificationResponse } from '@/modules/notifications/dto/notification.response';
import type {
  CreateNotificationParams,
  ListNotificationsParams,
  NotificationsRepository,
} from '@/modules/notifications/repositories/notifications.repository';

@Injectable()
export class NotificationsMockRepository implements NotificationsRepository {
  private readonly notifications = new Map<string, NotificationResponse>();
  private readonly userIndex = new Map<string, string[]>();
  private sequence = 0;

  private byUser(userId: string): string[] {
    const existing = this.userIndex.get(userId);
    if (existing) return existing;
    const created: string[] = [];
    this.userIndex.set(userId, created);
    return created;
  }

  create(params: CreateNotificationParams): Promise<NotificationResponse> {
    this.sequence += 1;
    const notification: NotificationResponse = {
      id: `notif_${this.sequence}`,
      type: params.type,
      title: params.title,
      body: params.body,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      readAt: null,
      createdAt: new Date().toISOString(),
    };

    this.notifications.set(notification.id, notification);
    this.byUser(params.userId).unshift(notification.id);

    return Promise.resolve(notification);
  }

  listSupervisorUserIds(): Promise<string[]> {
    return Promise.resolve(MOCK_AUTH_USER_DEFINITIONS.filter((user) =>
      user.roleCodes.some((role) => role === 'ADMIN' || role === 'SUPERVISOR'),
    ).map((user) => user.id));
  }

  list(params: ListNotificationsParams) {
    const all = this.byUser(params.userId)
      .map((id) => this.notifications.get(id))
      .filter((n): n is NotificationResponse => Boolean(n))
      .filter((n) => !params.unreadOnly || !n.readAt);

    const total = all.length;
    const start = (params.page - 1) * params.limit;
    const items = all.slice(start, start + params.limit);

    return Promise.resolve(
      createPaginatedResponse(items, params.page, params.limit, total),
    );
  }

  countUnread(userId: string): Promise<number> {
    return Promise.resolve(this.byUser(userId)
      .map((id) => this.notifications.get(id))
      .filter((n): n is NotificationResponse => Boolean(n))
      .filter((n) => !n.readAt).length);
  }

  markAsRead(id: string, userId: string): Promise<NotificationResponse | null> {
    if (!this.byUser(userId).includes(id)) {
      return Promise.resolve(null);
    }

    const existing = this.notifications.get(id);
    if (!existing) return Promise.resolve(null);

    const updated = { ...existing, readAt: existing.readAt ?? new Date().toISOString() };
    this.notifications.set(id, updated);
    return Promise.resolve(updated);
  }

  markAllAsRead(userId: string): Promise<number> {
    let count = 0;
    for (const id of this.byUser(userId)) {
      const existing = this.notifications.get(id);
      if (existing && !existing.readAt) {
        this.notifications.set(id, { ...existing, readAt: new Date().toISOString() });
        count += 1;
      }
    }
    return Promise.resolve(count);
  }
}
