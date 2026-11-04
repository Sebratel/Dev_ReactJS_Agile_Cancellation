import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BULK_CONTACT_JOB_REPOSITORY } from '@/common/data-source/data-source.constants';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';
import type {
  BulkContactItemStatus,
  BulkContactJobRepository,
  BulkContactPendingItem,
} from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository';

// Tamanho do lote processado por "tick" do worker. Cada envio chama o
// webhook do n8n (ate 15s de timeout) — mantemos baixo para nao segurar o
// processo por muito tempo nem sobrecarregar o n8n/Matrix com rajadas.
const BATCH_SIZE = 5;
const TICK_INTERVAL_MS = 4_000;

@Injectable()
export class WhatsappBulkContactWorkerService {
  private readonly logger = new Logger(WhatsappBulkContactWorkerService.name);
  private isRunning = false;

  constructor(
    @Inject(BULK_CONTACT_JOB_REPOSITORY)
    private readonly bulkContactJobRepository: BulkContactJobRepository,
    private readonly collectionCasesService: CollectionCasesService,
  ) {}

  @Interval(TICK_INTERVAL_MS)
  async tick() {
    // Guarda simples contra sobreposicao de execucoes (um processo so) — se
    // um lote demorar mais que o intervalo, o proximo tick e ignorado ate o
    // atual terminar.
    if (this.isRunning) return;

    this.isRunning = true;
    try {
      await this.processBatch();
    } catch (error) {
      this.logger.error(
        `Falha inesperada processando lote de envio HSM: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async processBatch() {
    const items =
      await this.bulkContactJobRepository.getPendingItems(BATCH_SIZE);

    if (items.length === 0) return;

    await Promise.all(items.map((item) => this.processItem(item)));
  }

  private async processItem(item: BulkContactPendingItem) {
    if (!item.createdByUserId) {
      await this.bulkContactJobRepository.recordItemResult({
        itemId: item.itemId,
        jobId: item.jobId,
        status: 'FAILED',
        errorMessage: 'Job sem usuário responsável associado.',
      });
      return;
    }

    const outcome = await this.collectionCasesService.attemptWhatsAppContact(
      item.collectionCaseId,
      item.createdByUserId,
    );

    const { status, errorMessage } = mapOutcomeToItemResult(outcome);

    await this.bulkContactJobRepository.recordItemResult({
      itemId: item.itemId,
      jobId: item.jobId,
      status,
      errorMessage,
    });
  }
}

function mapOutcomeToItemResult(
  outcome: Awaited<
    ReturnType<CollectionCasesService['attemptWhatsAppContact']>
  >,
): {
  status: Exclude<BulkContactItemStatus, 'PENDING'>;
  errorMessage: string | null;
} {
  switch (outcome.outcome) {
    case 'sent':
      return { status: 'SENT', errorMessage: null };
    case 'status_not_allowed':
      return {
        status: 'SKIPPED_STATUS',
        errorMessage: `Status não permite contato: ${outcome.status}.`,
      };
    case 'no_phone':
      return {
        status: 'SKIPPED_PHONE',
        errorMessage: 'Cliente sem telefone válido para WhatsApp.',
      };
    case 'case_not_found':
      return { status: 'FAILED', errorMessage: 'Caso não encontrado.' };
    case 'failed':
      return { status: 'FAILED', errorMessage: outcome.error.message };
    default:
      return { status: 'FAILED', errorMessage: 'Resultado desconhecido.' };
  }
}
