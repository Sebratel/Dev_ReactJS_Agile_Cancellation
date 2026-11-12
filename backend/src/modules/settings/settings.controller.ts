import { Body, Controller, Get, Patch } from '@nestjs/common';
import { createApiResponse } from '@/common/responses/api-response';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
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
  async updateSettings(
    @Body() body: UpdateSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const settings = await this.settingsService.updateSettings(body, user.id);
    return createApiResponse(settings);
  }
}
