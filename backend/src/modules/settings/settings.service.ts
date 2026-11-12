import { Inject, Injectable, Optional } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '@/modules/audit/audit.service';
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
    // Opcional: sem o serviço de auditoria (testes), nada é gravado.
    @Optional() private readonly auditService?: AuditService,
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

  async updateSettings(
    dto: UpdateSettingsDto,
    actorId?: string,
  ): Promise<AppSettings> {
    const before = await this.getSettings();
    const entries: Record<string, string> = {};

    if (dto.allowAgentSendToCancellation !== undefined) {
      entries[APP_SETTING_KEYS.allowAgentSendToCancellation] = String(
        dto.allowAgentSendToCancellation,
      );
    }

    await this.repository.setMany(entries);

    const after = await this.getSettings();

    for (const key of Object.keys(after) as Array<keyof AppSettings>) {
      if (before[key] === after[key]) continue;

      await this.auditService?.record({
        action: AuditAction.UPDATE,
        entityType: 'SETTINGS',
        entityId: key,
        performedByUserId: actorId ?? null,
        metadata: {
          resourceType: 'SETTING',
          key,
          from: String(before[key]),
          to: String(after[key]),
        },
      });
    }

    return after;
  }

  async isAgentSendToCancellationAllowed(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.allowAgentSendToCancellation;
  }
}
