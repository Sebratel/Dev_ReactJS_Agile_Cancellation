export interface SettingsRepository {
  getAll(): Promise<Record<string, string>>;
  setMany(entries: Record<string, string>): Promise<void>;
}

export const SETTINGS_REPOSITORY = 'SETTINGS_REPOSITORY';
