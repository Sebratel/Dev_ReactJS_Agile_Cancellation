import { Injectable } from '@nestjs/common';
import type { SettingsRepository } from '@/modules/settings/repositories/settings.repository';

@Injectable()
export class SettingsMockRepository implements SettingsRepository {
  private readonly store = new Map<string, string>();

  async getAll(): Promise<Record<string, string>> {
    return Object.fromEntries(this.store.entries());
  }

  async setMany(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      this.store.set(key, value);
    }
  }
}
