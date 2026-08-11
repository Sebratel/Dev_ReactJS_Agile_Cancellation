import { Module } from '@nestjs/common';
import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { NotificationsMockRepository } from '@/modules/notifications/repositories/notifications-mock.repository';
import { NotificationsPrismaRepository } from '@/modules/notifications/repositories/notifications-prisma.repository';
import { notificationsRepositoryProvider } from '@/modules/notifications/repositories/notifications.repository.provider';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsMockRepository,
    NotificationsPrismaRepository,
    notificationsRepositoryProvider,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
