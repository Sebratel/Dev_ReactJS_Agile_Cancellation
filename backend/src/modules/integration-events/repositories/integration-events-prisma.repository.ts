import { Injectable } from '@nestjs/common';
import { Prisma, IntegrationEventStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma/prisma.service';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type { IntegrationEventListItemResponse, IntegrationEventsSummaryResponse } from '@/modules/integration-events/dto/integration-event-list-item.response';
import type { ListIntegrationEventsParams, IntegrationEventsRepository } from '@/modules/integration-events/repositories/integration-events.repository';

@Injectable()
export class IntegrationEventsPrismaRepository implements IntegrationEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListIntegrationEventsParams) {
    const { status, source, eventType, from, to, page, limit } = params;
    const skip = (page - 1) * limit;

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const where: Prisma.IntegrationEventWhereInput = {
      ...(status && { status: status as IntegrationEventStatus }),
      ...(source && { source }),
      ...(eventType && { eventType }),
      ...(fromDate || toDate ? {
        createdAt: {
          ...(fromDate && { gte: fromDate }),
          ...(toDate && { lte: toDate }),
        }
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.integrationEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.integrationEvent.count({ where }),
    ]);

    const mapped: IntegrationEventListItemResponse[] = items.map((e) => ({
      id: e.id,
      source: e.source,
      eventType: e.eventType,
      externalId: e.externalId,
      status: e.status,
      errorMessage: e.errorMessage,
      processedAt: e.processedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      payloadSize: JSON.stringify(e.payload).length,
    }));

    return createPaginatedResponse(mapped, page, limit, total);
  }

  async getSummary(): Promise<IntegrationEventsSummaryResponse> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [pending, processing, failed, completedToday] = await Promise.all([
      this.prisma.integrationEvent.count({
        where: { status: IntegrationEventStatus.PENDING },
      }),
      this.prisma.integrationEvent.count({
        where: { status: IntegrationEventStatus.PROCESSING },
      }),
      this.prisma.integrationEvent.count({
        where: { status: IntegrationEventStatus.FAILED },
      }),
      this.prisma.integrationEvent.count({
        where: {
          status: IntegrationEventStatus.COMPLETED,
          processedAt: { gte: startOfToday },
        },
      }),
    ]);

    return { pending, processing, failed, completedToday };
  }
}
