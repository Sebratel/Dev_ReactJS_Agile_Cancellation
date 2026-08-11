import type { Provider } from '@nestjs/common';
import { COLLECTION_CASES_REPOSITORY } from '@/common/data-source/data-source.constants';
import { PrismaService } from '@/database/prisma/prisma.service';
import { createCollectionCasesRepository } from '@/modules/collection-cases/repositories/collection-cases.repository.factory';

export const collectionCasesRepositoryProvider: Provider = {
  provide: COLLECTION_CASES_REPOSITORY,
  useFactory: (prisma: PrismaService) =>
    createCollectionCasesRepository(prisma),
  inject: [PrismaService],
};
