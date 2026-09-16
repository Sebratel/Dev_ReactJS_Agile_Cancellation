import { Inject, Injectable } from '@nestjs/common';
import {
  APP_SETTING_KEYS,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
} from '@/modules/settings/settings.constants';
import type { UpdateSettingsDto } from '@/modules/settings/dto/update-settings.dto';
import {
  SETTINGS_REPOSITORY,
  type SettingsRepository,
} from '@/modules/settings/repositories/settings.repository';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
}

@Injectable()
export class SettingsService {
  constructor(
    @Inject(SETTINGS_REPOSITORY)
    private readonly repository: SettingsRepository,
  ) {}

  async getSettings(): Promise<AppSettings> {
    const raw = await this.repository.getAll();

    return {
      allowAgentSendToCancellation: parseBoolean(
        raw[APP_SETTING_KEYS.allowAgentSendToCancellation],
        DEFAULT_APP_SETTINGS.allowAgentSendToCancellation,
      ),
    };
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<AppSettings> {
    const entries: Record<string, string> = {};

    if (dto.allowAgentSendToCancellation !== undefined) {
      entries[APP_SETTING_KEYS.allowAgentSendToCancellation] = String(
        dto.allowAgentSendToCancellation,
      );
    }

    await this.repository.setMany(entries);

    return this.getSettings();
  }

  async isAgentSendToCancellationAllowed(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.allowAgentSendToCancellation;
  }
}
