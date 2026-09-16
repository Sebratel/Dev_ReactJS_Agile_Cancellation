import { Module } from '@nestjs/common';
import { SettingsController } from '@/modules/settings/settings.controller';
import { SettingsService } from '@/modules/settings/settings.service';
import { settingsRepositoryProvider } from '@/modules/settings/repositories/settings.repository.provider';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, settingsRepositoryProvider],
  exports: [SettingsService],
})
export class SettingsModule {}
