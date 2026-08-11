import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from '@/config/configuration';
import { validateEnv } from '@/config/validate-env';
import { PrismaModule } from '@/database/prisma/prisma.module';
import { AuditLogsModule } from '@/modules/audit-logs/audit-logs.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { CancellationsModule } from '@/modules/cancellations/cancellations.module';
import { CaseNotesModule } from '@/modules/case-notes/case-notes.module';
import { CollectionAttemptsModule } from '@/modules/collection-attempts/collection-attempts.module';
import { CollectionCasesModule } from '@/modules/collection-cases/collection-cases.module';
import { ContractsModule } from '@/modules/contracts/contracts.module';
import { CustomersModule } from '@/modules/customers/customers.module';
import { DashboardModule } from '@/modules/dashboard/dashboard.module';
import { ErpSyncModule } from '@/modules/erp-sync/erp-sync.module';
import { HealthModule } from '@/modules/health/health.module';
import { IntegrationEventsModule } from '@/modules/integration-events/integration-events.module';
import { IntegrationsModule } from '@/modules/integrations/integrations.module';
import { InvoicesModule } from '@/modules/invoices/invoices.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { PaymentPromisesModule } from '@/modules/payment-promises/payment-promises.module';
import { RolesModule } from '@/modules/roles/roles.module';
import { UsersModule } from '@/modules/users/users.module';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CustomersModule,
    ContractsModule,
    InvoicesModule,
    CollectionCasesModule,
    CollectionAttemptsModule,
    CaseNotesModule,
    NotificationsModule,
    PaymentPromisesModule,
    CancellationsModule,
    DashboardModule,
    AuditModule,
    AuditLogsModule,
    WebhooksModule,
    IntegrationsModule,
    IntegrationEventsModule,
    ErpSyncModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
