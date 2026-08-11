import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { AuthMockRepository } from '@/modules/auth/repositories/auth-mock.repository';
import type { AuthPrismaRepository } from '@/modules/auth/repositories/auth-prisma.repository';
import type { AuthRepository } from '@/modules/auth/repositories/auth.repository';

export function createAuthRepository(
  mockRepository: AuthMockRepository,
  prismaRepository: AuthPrismaRepository,
): AuthRepository {
  return getDataSourceMode() === 'database' ? prismaRepository : mockRepository;
}
