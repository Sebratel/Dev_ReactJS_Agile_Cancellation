import type { Provider } from '@nestjs/common';
import { CANCELLATIONS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { PrismaService } from '@/database/prisma/prisma.service';
import { createCancellationsRepository } from '@/modules/cancellations/repositories/cancellations.repository.factory';

export const cancellationsRepositoryProvider: Provider = {
  provide: CANCELLATIONS_REPOSITORY,
  useFactory: (prisma: PrismaService) => createCancellationsRepository(prisma),
  inject: [PrismaService],
};
