import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, type Prisma } from '@prisma/client';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { PrismaService } from '@/database/prisma/prisma.service';

export type RecordAuditInput = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  performedByUserId?: string | null;
  metadata?: Prisma.InputJsonObject;
};

// Ponto único para gravar eventos de auditoria que não pertencem a uma
// transação de negócio (acesso, exportação...). NUNCA lança: se a gravação
// falhar, o login/exportação seguem normalmente e o erro vai para o log.
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput): Promise<void> {
    if (getDataSourceMode() !== 'database') {
      return;
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          performedByUserId: input.performedByUserId ?? null,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao gravar auditoria (${input.action} ${input.entityType}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
