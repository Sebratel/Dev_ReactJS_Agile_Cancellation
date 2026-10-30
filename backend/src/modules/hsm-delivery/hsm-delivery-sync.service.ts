import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { getHsmDeliveryDbConfig } from '@/config/hsm-delivery-db.config';
import { PrismaService } from '@/database/prisma/prisma.service';

export type HsmDeliveryState = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

// Codigos da Matrix (status_id em db_matrix_hsms_enviados): 1 Enviada,
// 2 Entregue, 3 Lida; qualquer outro (106, 16, 117, 127...) e falha de entrega.
export function classifyHsmStatus(statusId: number): HsmDeliveryState {
  if (statusId === 3) return 'READ';
  if (statusId === 2) return 'DELIVERED';
  if (statusId === 1) return 'SENT';
  return 'FAILED';
}

const REPORT_TABLE = 'db_matrix_hsms_enviados';
// So reavalia HSMs recentes cujo status ainda pode mudar (sem estado, enviado
// ou entregue). Lida e falha sao estados finais.
const LOOKBACK_DAYS = 14;
const CHUNK_SIZE = 500;

type ReportRow = RowDataPacket & {
  interaction_id: string | number;
  status_id: number;
  status: string | null;
  sent_at: Date;
};

@Injectable()
export class HsmDeliverySyncService implements OnModuleDestroy {
  private readonly logger = new Logger(HsmDeliverySyncService.name);
  private pool: Pool | null = null;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  @Cron('*/5 * * * *')
  handleScheduledSync(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    void this.sync()
      .catch((error: unknown) => {
        this.logger.error(
          'Falha ao sincronizar status de entrega de HSM.',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        this.running = false;
      });
  }

  private getPool(): Pool | null {
    if (this.pool) {
      return this.pool;
    }

    const config = getHsmDeliveryDbConfig();

    if (!config) {
      return null;
    }

    this.pool = createPool({
      ...config,
      connectionLimit: 2,
      connectTimeout: 10_000,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });

    return this.pool;
  }

  async sync(): Promise<{ checked: number; updated: number }> {
    const pool = this.getPool();

    if (!pool || getDataSourceMode() !== 'database') {
      return { checked: 0, updated: 0 };
    }

    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
    const cases = await this.prisma.collectionCase.findMany({
      where: {
        matrixAttendanceCode: { not: null },
        matrixLastOutboundAt: { gte: since },
        OR: [
          { hsmDeliveryState: null },
          { hsmDeliveryState: { in: ['SENT', 'DELIVERED'] } },
        ],
      },
      select: {
        id: true,
        matrixAttendanceCode: true,
        hsmDeliveryState: true,
        hsmDeliveryDetail: true,
      },
    });

    let updated = 0;

    for (let i = 0; i < cases.length; i += CHUNK_SIZE) {
      const chunk = cases.slice(i, i + CHUNK_SIZE);
      const codes = chunk.map((c) => c.matrixAttendanceCode as string);

      const [rows] = await pool.query<ReportRow[]>(
        `SELECT interaction_id, status_id, status, sent_at
           FROM ${REPORT_TABLE}
          WHERE interaction_id IN (?)
          ORDER BY sent_at ASC`,
        [codes],
      );

      // Ordenado por envio ascendente: o ultimo HSM do atendimento prevalece.
      const latestByInteraction = new Map<string, ReportRow>();
      for (const row of rows) {
        latestByInteraction.set(String(row.interaction_id), row);
      }

      const now = new Date();

      for (const collectionCase of chunk) {
        const row = latestByInteraction.get(
          collectionCase.matrixAttendanceCode as string,
        );

        if (!row) {
          continue;
        }

        const state = classifyHsmStatus(Number(row.status_id));
        const detail = row.status?.trim().slice(0, 255) || null;

        if (
          state === collectionCase.hsmDeliveryState &&
          detail === collectionCase.hsmDeliveryDetail
        ) {
          continue;
        }

        await this.prisma.collectionCase.update({
          where: { id: collectionCase.id },
          data: {
            hsmDeliveryState: state,
            hsmDeliveryDetail: detail,
            hsmDeliveryAt: now,
          },
        });
        updated += 1;
      }
    }

    if (updated > 0) {
      this.logger.log(
        `Status de HSM sincronizado: ${updated} de ${cases.length} caso(s) atualizado(s).`,
      );
    }

    return { checked: cases.length, updated };
  }
}
