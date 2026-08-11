import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { UsersMockRepository } from '@/modules/users/repositories/users-mock.repository';
import type { UsersPrismaRepository } from '@/modules/users/repositories/users-prisma.repository';
import type { UsersRepository } from '@/modules/users/repositories/users.repository';

export function createUsersRepository(
  mockRepository: UsersMockRepository,
  prismaRepository: UsersPrismaRepository,
): UsersRepository {
  return getDataSourceMode() === 'database' ? prismaRepository : mockRepository;
}
