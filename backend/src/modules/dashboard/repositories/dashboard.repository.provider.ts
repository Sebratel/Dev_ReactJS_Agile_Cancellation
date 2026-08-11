import type { Provider } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from '@/common/data-source/data-source.constants';
import { PrismaService } from '@/database/prisma/prisma.service';
import { createDashboardRepository } from '@/modules/dashboard/repositories/dashboard.repository.factory';

export const dashboardRepositoryProvider: Provider = {
  provide: DASHBOARD_REPOSITORY,
  useFactory: (prisma: PrismaService) => createDashboardRepository(prisma),
  inject: [PrismaService],
};
