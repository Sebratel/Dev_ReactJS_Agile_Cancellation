import type { FactoryProvider } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from '@/common/data-source/data-source.constants';
import { COLLECTION_CASES_REPOSITORY } from '@/common/data-source/data-source.constants';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { DashboardMockRepository } from '@/modules/dashboard/repositories/dashboard-mock.repository';
import { DashboardPrismaRepository } from '@/modules/dashboard/repositories/dashboard-prisma.repository';
import { createDashboardRepository } from '@/modules/dashboard/repositories/dashboard.repository.factory';
import { dashboardRepositoryProvider } from '@/modules/dashboard/repositories/dashboard.repository.provider';
import { CollectionCasesMockRepository } from '@/modules/collection-cases/repositories/collection-cases-mock.repository';
import { CollectionCasesPrismaRepository } from '@/modules/collection-cases/repositories/collection-cases-prisma.repository';
import { createCollectionCasesRepository } from '@/modules/collection-cases/repositories/collection-cases.repository.factory';
import { collectionCasesRepositoryProvider } from '@/modules/collection-cases/repositories/collection-cases.repository.provider';

describe('Repository providers', () => {
  const prisma = {} as PrismaService;
  const originalMode = process.env.DATA_SOURCE_MODE;

  afterEach(() => {
    process.env.DATA_SOURCE_MODE = originalMode;
  });

  it('registra DashboardMockRepository quando DATA_SOURCE_MODE=mock', () => {
    process.env.DATA_SOURCE_MODE = 'mock';

    const repository = createDashboardRepository(prisma);

    expect(repository).toBeInstanceOf(DashboardMockRepository);
  });

  it('registra DashboardPrismaRepository quando DATA_SOURCE_MODE=database', () => {
    process.env.DATA_SOURCE_MODE = 'database';

    const repository = createDashboardRepository(prisma);

    expect(repository).toBeInstanceOf(DashboardPrismaRepository);
  });

  it('registra CollectionCasesMockRepository quando DATA_SOURCE_MODE=mock', () => {
    process.env.DATA_SOURCE_MODE = 'mock';

    const repository = createCollectionCasesRepository(prisma);

    expect(repository).toBeInstanceOf(CollectionCasesMockRepository);
  });

  it('registra CollectionCasesPrismaRepository quando DATA_SOURCE_MODE=database', () => {
    process.env.DATA_SOURCE_MODE = 'database';

    const repository = createCollectionCasesRepository(prisma);

    expect(repository).toBeInstanceOf(CollectionCasesPrismaRepository);
  });

  it('expoe tokens de injeção esperados', () => {
    const dashboardProvider = dashboardRepositoryProvider as FactoryProvider;
    const collectionCasesProvider =
      collectionCasesRepositoryProvider as FactoryProvider;

    expect(dashboardProvider.provide).toBe(DASHBOARD_REPOSITORY);
    expect(collectionCasesProvider.provide).toBe(COLLECTION_CASES_REPOSITORY);
  });
});
