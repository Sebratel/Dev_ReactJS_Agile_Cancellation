import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type { NotificationResponse } from '@/modules/notifications/dto/notification.response';
import type {
  CreateNotificationParams,
  ListNotificationsParams,
  NotificationsRepository,
} from '@/modules/notifications/repositories/notifications.repository';

function mapNotification(n: {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationResponse {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    entityType: n.entityType,
    entityId: n.entityId,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationsPrismaRepository implements NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateNotificationParams,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });

    return mapNotification(notification);
  }

  async listSupervisorUserIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userRoles: {
          some: {
            role: {
              code: { in: ['ADMIN', 'SUPERVISOR'] },
            },
          },
        },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  async list(params: ListNotificationsParams) {
    const { userId, unreadOnly, page, limit } = params;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly && { readAt: null }),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return createPaginatedResponse(
      items.map(mapNotification),
      page,
      limit,
      total,
    );
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<NotificationResponse | null> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });

    return mapNotification(updated);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return result.count;
  }
}
