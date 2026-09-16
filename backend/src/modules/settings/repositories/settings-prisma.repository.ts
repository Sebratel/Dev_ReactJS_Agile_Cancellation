import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import type { SettingsRepository } from '@/modules/settings/repositories/settings.repository';

@Injectable()
export class SettingsPrismaRepository implements SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.appSetting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async setMany(entries: Record<string, string>): Promise<void> {
    const operations = Object.entries(entries).map(([key, value]) =>
      this.prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    );

    if (operations.length === 0) {
      return;
    }

    await this.prisma.$transaction(operations);
  }
}
