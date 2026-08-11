import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { DashboardMockRepository } from '@/modules/dashboard/repositories/dashboard-mock.repository';
import { DashboardPrismaRepository } from '@/modules/dashboard/repositories/dashboard-prisma.repository';
import type { DashboardRepository } from '@/modules/dashboard/repositories/dashboard.repository';

export function createDashboardRepository(
  prisma: PrismaService,
): DashboardRepository {
  if (getDataSourceMode() === 'database') {
    return new DashboardPrismaRepository(prisma);
  }

  return new DashboardMockRepository();
}
