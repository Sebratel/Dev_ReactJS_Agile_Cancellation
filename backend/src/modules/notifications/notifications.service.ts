import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import { MOCK_AUTH_USER_DEFINITIONS } from '@/modules/auth/mocks/mock-auth-users';
import type { ListNotificationsDto } from '@/modules/notifications/dto/list-notifications.dto';
import {
  NOTIFICATIONS_REPOSITORY,
  type CreateNotificationParams,
  type NotificationsRepository,
} from '@/modules/notifications/repositories/notifications.repository';

const MOCK_USER_IDS = new Set(MOCK_AUTH_USER_DEFINITIONS.map((u) => u.id));

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly repository: NotificationsRepository,
  ) {}

  /**
   * Cria uma notificacao para o usuario. Usuarios mock (dev-login) nao
   * existem no banco real, entao a notificacao e silenciosamente ignorada
   * para nao violar a FK — mesma logica do PerformedByResolverService.
   */
  async notify(params: CreateNotificationParams): Promise<void> {
    if (MOCK_USER_IDS.has(params.userId)) {
      return;
    }

    await this.repository.create(params);
  }

  async notifySupervisors(
    params: Omit<CreateNotificationParams, 'userId'>,
  ): Promise<void> {
    const supervisorUserIds = await this.repository.listSupervisorUserIds();

    await Promise.all(
      supervisorUserIds.map((userId) =>
        this.repository.create({
          ...params,
          userId,
        }),
      ),
    );
  }

  async list(userId: string, dto: ListNotificationsDto) {
    const result = await this.repository.list({
      userId,
      unreadOnly: dto.unreadOnly,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    });

    return createApiResponse(result);
  }

  async countUnread(userId: string) {
    const count = await this.repository.countUnread(userId);
    return createApiResponse({ count });
  }

  async markAsRead(id: string, userId: string) {
    const updated = await this.repository.markAsRead(id, userId);

    if (!updated) {
      throw new AppException('Notificação não encontrada.', HttpStatus.NOT_FOUND);
    }

    return createApiResponse(updated);
  }

  async markAllAsRead(userId: string) {
    const count = await this.repository.markAllAsRead(userId);
    return createApiResponse({ count });
  }
}
