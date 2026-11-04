import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { ListNotificationsDto } from '@/modules/notifications/dto/list-notifications.dto';
import { NotificationsService } from '@/modules/notifications/notifications.service';

const ALL_ROLES = [
  'ADMIN',
  'SUPERVISOR',
  'COLLECTION_AGENT',
  'CANCELLATION_AGENT',
  'VIEWER',
  'FINANCE',
] as const;

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(...ALL_ROLES)
  @Get()
  list(
    @Query() query: ListNotificationsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.list(user.id, query);
  }

  @Roles(...ALL_ROLES)
  @Get('unread-count')
  countUnread(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.countUnread(user.id);
  }

  @Roles(...ALL_ROLES)
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Roles(...ALL_ROLES)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
