import type { Provider } from '@nestjs/common';
import { AUTH_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createAuthRepository } from '@/modules/auth/repositories/auth.repository.factory';
import { AuthMockRepository } from '@/modules/auth/repositories/auth-mock.repository';
import { AuthPrismaRepository } from '@/modules/auth/repositories/auth-prisma.repository';

export const authRepositoryProvider: Provider = {
  provide: AUTH_REPOSITORY,
  useFactory: createAuthRepository,
  inject: [AuthMockRepository, AuthPrismaRepository],
};
