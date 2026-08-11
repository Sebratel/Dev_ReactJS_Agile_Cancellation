import type { Provider } from '@nestjs/common';
import { NOTIFICATIONS_REPOSITORY } from '@/modules/notifications/repositories/notifications.repository';
import { createNotificationsRepository } from '@/modules/notifications/repositories/notifications.repository.factory';
import { NotificationsMockRepository } from '@/modules/notifications/repositories/notifications-mock.repository';
import { NotificationsPrismaRepository } from '@/modules/notifications/repositories/notifications-prisma.repository';

export const notificationsRepositoryProvider: Provider = {
  provide: NOTIFICATIONS_REPOSITORY,
  useFactory: createNotificationsRepository,
  inject: [NotificationsMockRepository, NotificationsPrismaRepository],
};
