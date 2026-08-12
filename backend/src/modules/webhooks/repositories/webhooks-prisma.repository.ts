import { Injectable } from '@nestjs/common';
import { AuditAction, IntegrationEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma/prisma.service';
import type { IngestCollectionEventDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import type { MatrixReplyDto } from '@/modules/webhooks/dto/matrix-reply.dto';
import type {
  IngestionSummary,
  MatrixReplyResult,
  WebhooksRepository,
} from '@/modules/webhooks/repositories/webhooks.repository';

@Injectable()
export class WebhooksPrismaRepository implements WebhooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ingestCollectionBatch(
    source: string,
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
      await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { document: event.customer.document },
          update: {
            name: event.customer.name,
            email: event.customer.email ?? null,
            phone: event.customer.phone ?? null,
            externalId: event.customer.externalId ?? null,
          },
          create: {
            document: event.customer.document,
            name: event.customer.name,
            email: event.customer.email ?? null,
            phone: event.customer.phone ?? null,
            externalId: event.customer.externalId ?? null,
          },
        });
        summary.customersUpserted += 1;

        const contract = await tx.contract.upsert({
          where: { code: event.contract.code },
          update: {
            customerId: customer.id,
            status: event.contract.status ?? undefined,
            startDate: new Date(event.contract.startDate),
            totalValue: event.contract.totalValue ?? null,
            monthlyValue: event.contract.monthlyValue ?? null,
            externalId: event.contract.externalId ?? null,
          },
          create: {
            customerId: customer.id,
            code: event.contract.code,
            status: event.contract.status ?? undefined,
            startDate: new Date(event.contract.startDate),
            totalValue: event.contract.totalValue ?? null,
            monthlyValue: event.contract.monthlyValue ?? null,
            externalId: event.contract.externalId ?? null,
          },
        });
        summary.contractsUpserted += 1;

        for (const invoice of event.invoices ?? []) {
          await tx.invoice.upsert({
            where: { externalId: invoice.externalId },
            update: {
              contractId: contract.id,
              invoiceNumber: invoice.invoiceNumber ?? null,
              status: invoice.status ?? undefined,
              dueDate: new Date(invoice.dueDate),
              amount: invoice.amount,
              paidAmount: invoice.paidAmount ?? 0,
            },
            create: {
              contractId: contract.id,
              invoiceNumber: invoice.invoiceNumber ?? null,
              status: invoice.status ?? undefined,
              dueDate: new Date(invoice.dueDate),
              amount: invoice.amount,
              paidAmount: invoice.paidAmount ?? 0,
              externalId: invoice.externalId,
            },
          });
          summary.invoicesUpserted += 1;
        }

        await tx.collectionCase.upsert({
          where: { externalId: event.externalId },
          update: {
            contractId: contract.id,
            customerId: customer.id,
            status: event.case.status ?? undefined,
            priority: event.case.priority ?? undefined,
            outstandingAmount: event.case.outstandingAmount,
            daysOverdue: event.case.daysOverdue ?? 0,
          },
          create: {
            contractId: contract.id,
            customerId: customer.id,
            status: event.case.status ?? undefined,
            priority: event.case.priority ?? undefined,
            outstandingAmount: event.case.outstandingAmount,
            daysOverdue: event.case.daysOverdue ?? 0,
            externalId: event.externalId,
          },
        });
        summary.casesUpserted += 1;
      });
    }

    await this.recordIntegrationEvent(source, summary);

    return summary;
  }

  async recordMatrixReply(input: MatrixReplyDto): Promise<MatrixReplyResult> {
    const attendanceCode = input.codAtendimento ?? input.cod_atendimento;
    const messageCode = input.codMensagem ?? input.cod_mensagem;
    const filters = [
      input.caseId ? { id: input.caseId } : null,
      attendanceCode ? { matrixAttendanceCode: attendanceCode } : null,
      messageCode ? { matrixMessageCode: messageCode } : null,
    ].filter(Boolean) as Prisma.CollectionCaseWhereInput[];

    if (filters.length === 0) {
      return { outcome: 'case_not_found' };
    }

    const record = await this.prisma.collectionCase.findFirst({
      where: { OR: filters },
      select: {
        id: true,
        assignedUserId: true,
        matrixAwaitingReply: true,
        matrixLastReplyAt: true,
        customer: { select: { name: true } },
      },
    });

    if (!record) {
      await this.recordMatrixReplyIntegrationEvent(input, 'DISCARDED');
      return { outcome: 'case_not_found' };
    }

    const now = new Date();
    const replyAt = input.receivedAt ? new Date(input.receivedAt) : now;
    const alreadyProcessed =
      !record.matrixAwaitingReply &&
      record.matrixLastReplyAt !== null &&
      replyAt.getTime() <= record.matrixLastReplyAt.getTime();

    if (alreadyProcessed) {
      return {
        outcome: 'already_processed',
        caseId: record.id,
        assignedUserId: record.assignedUserId,
        customerName: record.customer.name,
      };
    }

    const attempt = await this.prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.collectionAttempt.create({
        data: {
          collectionCaseId: record.id,
          performedByUserId: record.assignedUserId,
          channel: 'WHATSAPP',
          result: 'CONTACTED',
          attemptedAt: replyAt,
          notes: buildMatrixReplyAttemptNotes(input),
        },
      });

      await tx.collectionCase.update({
        where: { id: record.id },
        data: {
          matrixAwaitingReply: false,
          matrixLastReplyAt: replyAt,
          updatedAt: now,
        },
      });

      await tx.integrationEvent.create({
        data: {
          source: 'n8n_matrix',
          eventType: 'collection_cases.matrix_reply',
          status: IntegrationEventStatus.COMPLETED,
          payload: buildMatrixReplyPayload(input, record.id),
          processedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'COLLECTION_CASE',
          entityId: record.id,
          action: AuditAction.INTEGRATION,
          performedByUserId: record.assignedUserId,
          beforeSnapshot: {
            matrixAwaitingReply: record.matrixAwaitingReply,
            matrixLastReplyAt: record.matrixLastReplyAt?.toISOString() ?? null,
          },
          afterSnapshot: {
            matrixAwaitingReply: false,
            matrixLastReplyAt: replyAt.toISOString(),
            attemptId: createdAttempt.id,
          },
          metadata: {
            provider: 'n8n_matrix',
            resourceType: 'COLLECTION_ATTEMPT',
            attemptId: createdAttempt.id,
            matrixAttendanceCode: attendanceCode ?? null,
            matrixMessageCode: messageCode ?? null,
          },
        },
      });

      return createdAttempt;
    });

    return {
      outcome: 'success',
      caseId: record.id,
      assignedUserId: record.assignedUserId,
      customerName: record.customer.name,
      attemptId: attempt.id,
    };
  }

  private async recordIntegrationEvent(
    source: string,
    summary: IngestionSummary,
  ): Promise<void> {
    await this.prisma.integrationEvent.create({
      data: {
        source,
        eventType: 'collection_cases.ingest',
        status: 'COMPLETED',
        payload: { ...summary },
        processedAt: new Date(),
      },
    });
  }

  private async recordMatrixReplyIntegrationEvent(
    input: MatrixReplyDto,
    status: IntegrationEventStatus,
  ): Promise<void> {
    await this.prisma.integrationEvent.create({
      data: {
        source: 'n8n_matrix',
        eventType: 'collection_cases.matrix_reply',
        status,
        payload: buildMatrixReplyPayload(input, null),
        processedAt: new Date(),
      },
    });
  }
}

function buildMatrixReplyAttemptNotes(input: MatrixReplyDto) {
  const parts = ['Cliente respondeu via Matrix.'];

  if (input.message?.trim()) {
    parts.push(`Mensagem: ${input.message.trim()}`);
  }

  if (input.author?.trim()) {
    parts.push(`Autor: ${input.author.trim()}`);
  }

  return parts.join(' ');
}

function buildMatrixReplyPayload(
  input: MatrixReplyDto,
  caseId: string | null,
): Prisma.InputJsonObject {
  return {
    caseId,
    codAtendimento: input.codAtendimento ?? input.cod_atendimento ?? null,
    codMensagem: input.codMensagem ?? input.cod_mensagem ?? null,
    message: input.message ?? null,
    author: input.author ?? null,
    phone: input.phone ?? null,
    receivedAt: input.receivedAt ?? null,
    raw: input.raw ? (input.raw as Prisma.InputJsonObject) : null,
  };
}
