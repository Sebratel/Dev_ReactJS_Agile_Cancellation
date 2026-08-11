import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import type { IngestCollectionEventDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import type {
  IngestionSummary,
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
}
