export type NotificationResponse = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsListParams = {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
};
