import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function shouldAutoConnect(): boolean {
  return process.env.PRISMA_AUTO_CONNECT !== 'false';
}

function shouldAllowDatabaseUnavailable(): boolean {
  return (
    process.env.ALLOW_DATABASE_UNAVAILABLE === 'true' ||
    process.env.GOOGLE_AUTH_MODE === 'mock'
  );
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly autoConnect = shouldAutoConnect();
  private readonly allowDatabaseUnavailable = shouldAllowDatabaseUnavailable();

  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.autoConnect) {
      return;
    }

    try {
      await this.$connect();
      this.logger.log('Prisma conectado ao MySQL.');
    } catch (error) {
      this.logger.error('Falha ao conectar Prisma ao MySQL.');

      if (this.allowDatabaseUnavailable) {
        this.logger.warn(
          'API iniciando sem conexao com banco porque o modo mock/staging permite indisponibilidade temporaria.',
        );
        return;
      }

      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.autoConnect) {
      return;
    }

    await this.$disconnect();
  }
}
