import { Injectable } from '@nestjs/common';
import type { SettingsRepository } from '@/modules/settings/repositories/settings.repository';

@Injectable()
export class SettingsMockRepository implements SettingsRepository {
  private readonly store = new Map<string, string>();

  getAll(): Promise<Record<string, string>> {
    return Promise.resolve(Object.fromEntries(this.store.entries()));
  }

  setMany(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      this.store.set(key, value);
    }
    return Promise.resolve();
  }
}
