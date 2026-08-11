import { Module } from '@nestjs/common';
import { DashboardController } from '@/modules/dashboard/dashboard.controller';
import { DashboardService } from '@/modules/dashboard/dashboard.service';
import { dashboardRepositoryProvider } from '@/modules/dashboard/repositories/dashboard.repository.provider';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, dashboardRepositoryProvider],
})
export class DashboardModule {}
