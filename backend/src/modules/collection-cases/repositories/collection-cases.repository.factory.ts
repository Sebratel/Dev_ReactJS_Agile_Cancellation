import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { CollectionCasesMockRepository } from '@/modules/collection-cases/repositories/collection-cases-mock.repository';
import { CollectionCasesPrismaRepository } from '@/modules/collection-cases/repositories/collection-cases-prisma.repository';
import type { CollectionCasesRepository } from '@/modules/collection-cases/repositories/collection-cases.repository';

export function createCollectionCasesRepository(
  prisma: PrismaService,
): CollectionCasesRepository {
  if (getDataSourceMode() === 'database') {
    return new CollectionCasesPrismaRepository(prisma);
  }

  return new CollectionCasesMockRepository();
}
