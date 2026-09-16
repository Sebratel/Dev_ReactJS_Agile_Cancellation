import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { SettingsMockRepository } from '@/modules/settings/repositories/settings-mock.repository';
import { SettingsPrismaRepository } from '@/modules/settings/repositories/settings-prisma.repository';
import type { SettingsRepository } from '@/modules/settings/repositories/settings.repository';

export function createSettingsRepository(
  prisma: PrismaService,
): SettingsRepository {
  if (getDataSourceMode() === 'database') {
    return new SettingsPrismaRepository(prisma);
  }

  return new SettingsMockRepository();
}
