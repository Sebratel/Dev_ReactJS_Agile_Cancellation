import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { DashboardService } from '@/modules/dashboard/dashboard.service';
import { DashboardRankingQueryDto } from '@/modules/dashboard/dto/dashboard-ranking-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(
    'ADMIN',
    'SUPERVISOR',
    'COLLECTION_AGENT',
    'CANCELLATION_AGENT',
    'VIEWER',
    'FINANCE',
  )
  @Get('summary')
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSummary(user);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get('operations')
  getOperations() {
    return this.dashboardService.getOperations();
  }

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT')
  @Get('recovery-ranking')
  getRecoveryRanking(@Query() query: DashboardRankingQueryDto) {
    return this.dashboardService.getRecoveryRanking(query.period);
  }
}
