import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { SettingsController } from '@/modules/settings/settings.controller';
import { SettingsService } from '@/modules/settings/settings.service';
import { settingsRepositoryProvider } from '@/modules/settings/repositories/settings.repository.provider';

@Module({
  imports: [AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService, settingsRepositoryProvider],
  exports: [SettingsService],
})
export class SettingsModule {}
