import type { Provider } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { SETTINGS_REPOSITORY } from '@/modules/settings/repositories/settings.repository';
import { createSettingsRepository } from '@/modules/settings/repositories/settings.repository.factory';

export const settingsRepositoryProvider: Provider = {
  provide: SETTINGS_REPOSITORY,
  useFactory: (prisma: PrismaService) => createSettingsRepository(prisma),
  inject: [PrismaService],
};
