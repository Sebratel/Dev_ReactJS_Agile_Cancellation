import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { CancellationsMockRepository } from '@/modules/cancellations/repositories/cancellations-mock.repository';
import { CancellationsPrismaRepository } from '@/modules/cancellations/repositories/cancellations-prisma.repository';
import type { CancellationsRepository } from '@/modules/cancellations/repositories/cancellations.repository';

export function createCancellationsRepository(
  prisma: PrismaService,
): CancellationsRepository {
  if (getDataSourceMode() === 'database') {
    return new CancellationsPrismaRepository(prisma);
  }

  return new CancellationsMockRepository();
}
