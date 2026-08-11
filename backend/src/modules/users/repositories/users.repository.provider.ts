import type { Provider } from '@nestjs/common';
import { USERS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createUsersRepository } from '@/modules/users/repositories/users.repository.factory';
import { UsersMockRepository } from '@/modules/users/repositories/users-mock.repository';
import { UsersPrismaRepository } from '@/modules/users/repositories/users-prisma.repository';

export const usersRepositoryProvider: Provider = {
  provide: USERS_REPOSITORY,
  useFactory: createUsersRepository,
  inject: [UsersMockRepository, UsersPrismaRepository],
};
