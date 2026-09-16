import { Body, Controller, Get, Patch } from '@nestjs/common';
import { createApiResponse } from '@/common/responses/api-response';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UpdateSettingsDto } from '@/modules/settings/dto/update-settings.dto';
import { SettingsService } from '@/modules/settings/settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Roles(
    'ADMIN',
    'SUPERVISOR',
    'COLLECTION_AGENT',
    'CANCELLATION_AGENT',
    'FINANCE',
    'VIEWER',
  )
  @Get()
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    return createApiResponse(settings);
  }

  @Roles('ADMIN')
  @Patch()
  async updateSettings(@Body() body: UpdateSettingsDto) {
    const settings = await this.settingsService.updateSettings(body);
    return createApiResponse(settings);
  }
}
