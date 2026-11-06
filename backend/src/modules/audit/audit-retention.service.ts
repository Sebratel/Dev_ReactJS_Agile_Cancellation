import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuditAction } from '@prisma/client';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { PrismaService } from '@/database/prisma/prisma.service';

// Eventos de acesso crescem rápido (cada login/logout/exportação): ficam 12
// meses. Os registros de negócio (casos, promessas, cancelamentos...) NÃO são
// apagados por esta rotina.
export const ACCESS_AUDIT_RETENTION_DAYS = 365;

const ACCESS_ACTIONS: AuditAction[] = [
  AuditAction.LOGIN,
  AuditAction.LOGOUT,
  AuditAction.EXPORT,
];

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('30 3 * * *')
  async purgeOldAccessEvents(now: Date = new Date()): Promise<number> {
    if (getDataSourceMode() !== 'database') {
      return 0;
    }

    const limit = new Date(
      now.getTime() - ACCESS_AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: { action: { in: ACCESS_ACTIONS }, createdAt: { lt: limit } },
      });

      if (result.count > 0) {
        this.logger.log(
          `Auditoria: ${result.count} evento(s) de acesso com mais de ${ACCESS_AUDIT_RETENTION_DAYS} dias removido(s).`,
        );
      }

      return result.count;
    } catch (error) {
      this.logger.warn(
        `Falha na limpeza de auditoria de acesso: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }
}
