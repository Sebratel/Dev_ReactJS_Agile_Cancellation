import type { PaginatedResponse } from '@/common/pagination/paginated-response';
import type { NotificationResponse } from '@/modules/notifications/dto/notification.response';

export type CreateNotificationParams = {
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
};

export type ListNotificationsParams = {
  userId: string;
  unreadOnly?: boolean;
  page: number;
  limit: number;
};

export interface NotificationsRepository {
  create(params: CreateNotificationParams): Promise<NotificationResponse>;
  listSupervisorUserIds(): Promise<string[]>;
  list(
    params: ListNotificationsParams,
  ): Promise<PaginatedResponse<NotificationResponse>>;
  countUnread(userId: string): Promise<number>;
  markAsRead(
    id: string,
    userId: string,
  ): Promise<NotificationResponse | null>;
  markAllAsRead(userId: string): Promise<number>;
}

export const NOTIFICATIONS_REPOSITORY = 'NOTIFICATIONS_REPOSITORY';
