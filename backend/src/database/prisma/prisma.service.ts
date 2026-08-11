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

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly autoConnect = shouldAutoConnect();

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
