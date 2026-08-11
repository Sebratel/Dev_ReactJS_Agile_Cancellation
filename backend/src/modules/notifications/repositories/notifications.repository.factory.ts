import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { NotificationsMockRepository } from '@/modules/notifications/repositories/notifications-mock.repository';
import type { NotificationsPrismaRepository } from '@/modules/notifications/repositories/notifications-prisma.repository';
import type { NotificationsRepository } from '@/modules/notifications/repositories/notifications.repository';

export function createNotificationsRepository(
  mockRepository: NotificationsMockRepository,
  prismaRepository: NotificationsPrismaRepository,
): NotificationsRepository {
  return getDataSourceMode() === 'database' ? prismaRepository : mockRepository;
}
