import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { getAppConfig } from '@/config/app.config';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok',
      service: getAppConfig().appName,
      timestamp: new Date().toISOString(),
    };
  }

  async getReady(): Promise<{ status: 'ok' | 'error'; db: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'connected' };
    } catch {
      return { status: 'error', db: 'unreachable' };
    }
  }
}
