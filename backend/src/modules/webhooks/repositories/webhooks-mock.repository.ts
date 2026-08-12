import { Injectable } from '@nestjs/common';
import type { IngestCollectionEventDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import type { MatrixReplyDto } from '@/modules/webhooks/dto/matrix-reply.dto';
import type {
  IngestionSummary,
  MatrixReplyResult,
  WebhooksRepository,
} from '@/modules/webhooks/repositories/webhooks.repository';

/**
 * Mock em memoria: registra os externalIds vistos para simular idempotencia
 * sem tocar no banco. Usado quando DATA_SOURCE_MODE != database (ex.: testes).
 */
@Injectable()
export class WebhooksMockRepository implements WebhooksRepository {
  private readonly seenCases = new Set<string>();
  private readonly seenCustomers = new Set<string>();
  private readonly seenContracts = new Set<string>();
  private readonly seenInvoices = new Set<string>();
  private readonly seenMatrixReplies = new Set<string>();

  ingestCollectionBatch(
    _source: string,
    events: IngestCollectionEventDto[],
  ): Promise<IngestionSummary> {
    const summary: IngestionSummary = {
      received: events.length,
      customersUpserted: 0,
      contractsUpserted: 0,
      invoicesUpserted: 0,
      casesUpserted: 0,
      skipped: 0,
    };

    for (const event of events) {
      if (this.seenCases.has(event.externalId)) {
        summary.skipped += 1;
        continue;
      }

      this.seenCases.add(event.externalId);
      summary.casesUpserted += 1;

      if (!this.seenCustomers.has(event.customer.document)) {
        this.seenCustomers.add(event.customer.document);
        summary.customersUpserted += 1;
      }

      if (!this.seenContracts.has(event.contract.code)) {
        this.seenContracts.add(event.contract.code);
        summary.contractsUpserted += 1;
      }

      for (const invoice of event.invoices ?? []) {
        if (!this.seenInvoices.has(invoice.externalId)) {
          this.seenInvoices.add(invoice.externalId);
          summary.invoicesUpserted += 1;
        }
      }
    }

    return Promise.resolve(summary);
  }

  recordMatrixReply(input: MatrixReplyDto): Promise<MatrixReplyResult> {
    const caseId =
      input.caseId ??
      input.codAtendimento ??
      input.cod_atendimento ??
      input.codMensagem ??
      input.cod_mensagem;

    if (!caseId) {
      return Promise.resolve({ outcome: 'case_not_found' });
    }

    if (this.seenMatrixReplies.has(caseId)) {
      return Promise.resolve({
        outcome: 'already_processed',
        caseId,
        assignedUserId: 'usr_marina',
        customerName: 'Cliente Teste',
      });
    }

    this.seenMatrixReplies.add(caseId);

    return Promise.resolve({
      outcome: 'success',
      caseId,
      assignedUserId: 'usr_marina',
      customerName: 'Cliente Teste',
      attemptId: 'att_matrix_reply',
    });
  }
}
