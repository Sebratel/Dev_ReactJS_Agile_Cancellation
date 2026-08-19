import {
  AuditAction,
  CancellationStatus,
  CollectionStatus,
  InvoiceStatus,
  PaymentPromiseStatus,
  Prisma,
  UserStatus,
  IntegrationEventStatus,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import { formatDecimal } from '@/common/utils/decimal.util';
import { PrismaService } from '@/database/prisma/prisma.service';
import type { CollectionCaseDetailsResponse } from '@/modules/collection-cases/dto/collection-case-details.response';
import type { CollectionCaseListItemResponse } from '@/modules/collection-cases/dto/collection-case-list-item.response';
import {
  buildCollectionCasesOrderBy,
  buildCollectionCasesWhere,
  matchesOverdueDateFilters,
  normalizeListParams,
  OPEN_INVOICE_STATUSES,
} from '@/modules/collection-cases/utils/collection-cases-list.utils';
import type { OverdueDateSummaryResponse } from '@/modules/collection-cases/dto/overdue-date-summary.response';
import { BULK_CONTACT_MAX_CASES } from '@/common/constants/bulk-contact.constants';
import type { CollectionAttemptResponse } from '@/modules/collection-cases/dto/collection-attempt.response';
import type { CancellationProcessResponse } from '@/modules/collection-cases/dto/cancellation-process.response';
import type { PaymentPromiseResponse } from '@/modules/collection-cases/dto/payment-promise.response';
import type {
  AssignCaseParams,
  AssignCaseResult,
  AutoDistributeCasesParams,
  AutoDistributeCasesResult,
  BulkAssignCasesParams,
  BulkAssignCasesResult,
  CollectionCasesListParams,
  CollectionCasesRepository,
  CreateCollectionAttemptParams,
  CreatePaymentPromiseParams,
  RecordWhatsAppContactIntegrationParams,
  RecordWhatsAppContactIntegrationResult,
  RevertCancellationParams,
  RevertCancellationResult,
  SendToCancellationParams,
  SendToCancellationResult,
  UpdatePaymentPromiseStatusParams,
  UpdatePaymentPromiseStatusResult,
} from '@/modules/collection-cases/repositories/collection-cases.repository';
import { mapPaymentPromiseToResponse } from '@/modules/collection-cases/utils/payment-promise.mapper';
import {
  buildPaymentPromiseStatusUpdateData,
  mergePaymentPromiseNotes,
} from '@/modules/collection-cases/utils/payment-promise-status.utils';
import type { CollectionCaseTimelineResponse } from '@/modules/collection-cases/dto/collection-case-timeline.response';
import { buildCollectionCaseTimeline } from '@/modules/collection-cases/utils/collection-case-timeline.builder';
import {
  mapAuditLogToTimelineSource,
  resolveCancellationProcessCompletedEventsFromAuditLogs,
  resolveCancellationSentEventsFromAuditLogs,
  resolveCancellationStepCompletedEventsFromAuditLogs,
  resolvePromiseActorFromAuditLogs,
} from '@/modules/collection-cases/utils/collection-case-timeline-audit.utils';
import {
  canSendCollectionCaseToCancellation,
  hasActiveCancellationProcess,
} from '@/modules/collection-cases/utils/send-to-cancellation.utils';
import {
  canRevertCancellation,
  isReversibleCancellationProcess,
} from '@/modules/collection-cases/utils/revert-cancellation.utils';
import { buildDefaultCancellationStepsForPrisma } from '@/modules/cancellations/utils/create-default-cancellation-steps.util';
import { getCancellationStepLabel } from '@/modules/cancellations/constants/default-cancellation-steps.constants';

const ASSIGNABLE_CASE_ROLE_CODES = new Set([
  'COLLECTION_AGENT',
  'CANCELLATION_AGENT',
]);

function hasAssignableCaseRole(user: {
  userRoles: Array<{ role: { code: string } }>;
}) {
  return user.userRoles.some(({ role }) =>
    ASSIGNABLE_CASE_ROLE_CODES.has(role.code),
  );
}

const collectionCaseDetailsInclude = {
  customer: true,
  contract: { include: { invoices: true } },
  assignedUser: true,
  collectionAttempts: { orderBy: { attemptedAt: 'desc' as const } },
  paymentPromises: { orderBy: { promisedDate: 'desc' as const } },
  cancellationProcesses: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' as const },
      },
    },
  },
} satisfies Prisma.CollectionCaseInclude;

type CollectionCaseWithRelations = Prisma.CollectionCaseGetPayload<{
  include: typeof collectionCaseDetailsInclude;
}>;

type MatrixTrackingFields = {
  matrixAttendanceCode?: string | null;
  matrixMessageCode?: string | null;
  matrixAwaitingReply?: boolean;
  matrixLastOutboundAt?: Date | null;
  matrixLastReplyAt?: Date | null;
};

@Injectable()
export class CollectionCasesPrismaRepository implements CollectionCasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCases(params: CollectionCasesListParams) {
    const normalized = normalizeListParams(params);
    const skip = (normalized.page - 1) * normalized.limit;
    const where = buildCollectionCasesWhere(normalized);
    const orderBy = buildCollectionCasesOrderBy(normalized);
    const now = new Date();

    const dueDateFilteredIds = await this.resolveDueDateFilteredIds(
      where,
      normalized,
      now,
    );

    if (dueDateFilteredIds !== null) {
      if (dueDateFilteredIds.length === 0) {
        return createPaginatedResponse([], normalized.page, normalized.limit, 0);
      }

      where.id = { in: dueDateFilteredIds };
    }

    const [records, total] = await Promise.all([
      this.prisma.collectionCase.findMany({
        where,
        skip,
        take: normalized.limit,
        orderBy,
        include: {
          customer: { select: { name: true, phone: true } },
          contract: {
            select: {
              code: true,
              status: true,
              invoices: {
                where: {
                  dueDate: { lt: now },
                  status: {
                    in: [
                      InvoiceStatus.OPEN,
                      InvoiceStatus.PARTIALLY_PAID,
                      InvoiceStatus.OVERDUE,
                    ],
                  },
                },
                orderBy: { dueDate: 'asc' },
                take: 2,
                select: { dueDate: true },
              },
            },
          },
          assignedUser: { select: { id: true, name: true } },
        },
      }),
      this.prisma.collectionCase.count({ where }),
    ]);

    const items: CollectionCaseListItemResponse[] = records.map((record) => {
      const matrix = record as typeof record & MatrixTrackingFields;

      return {
        id: record.id,
        customerName: record.customer.name,
        customerPhone: record.customer.phone,
        contractCode: record.contract.code,
        contractStatus: record.contract.status,
        firstOverdueDate:
          record.contract.invoices[0]?.dueDate.toISOString() ?? null,
        secondOverdueDate:
          record.contract.invoices[1]?.dueDate.toISOString() ?? null,
        status: record.status,
        priority: record.priority,
        daysOverdue: record.daysOverdue,
        outstandingAmount: formatDecimal(record.outstandingAmount),
        assignedTo: record.assignedUser
          ? { id: record.assignedUser.id, name: record.assignedUser.name }
          : null,
        slaDueAt: record.slaDueAt?.toISOString() ?? null,
        matrixAwaitingReply: matrix.matrixAwaitingReply ?? false,
        matrixLastOutboundAt:
          matrix.matrixLastOutboundAt?.toISOString() ?? null,
        matrixLastReplyAt: matrix.matrixLastReplyAt?.toISOString() ?? null,
      };
    });

    return createPaginatedResponse(
      items,
      normalized.page,
      normalized.limit,
      total,
    );
  }

  // "1o vencimento"/"2o vencimento" tem que bater com a 1a/2a fatura em
  // aberto mais antiga do contrato — as mesmas exibidas na tela — nao com
  // "qualquer fatura em aberto vencendo naquele dia" (um contrato pode
  // acumular uma 3a fatura vencida sem ainda ter sido cancelado; ver
  // comentario em buildCollectionCasesWhere). Como Prisma nao filtra por
  // posicao dentro de uma relacao, resolvemos isso buscando os IDs
  // candidatos e comparando em JS. Retorna null quando nenhum filtro de
  // vencimento foi pedido (nao restringe nada); retorna a lista de ids (pode
  // ser vazia) quando algum filtro foi pedido.
  private async resolveDueDateFilteredIds(
    where: Prisma.CollectionCaseWhereInput,
    normalized: CollectionCasesListParams,
    now: Date,
  ): Promise<string[] | null> {
    if (!normalized.firstDueDate && !normalized.secondDueDate) {
      return null;
    }

    const candidates = await this.prisma.collectionCase.findMany({
      where,
      select: {
        id: true,
        contract: {
          select: {
            invoices: {
              where: {
                dueDate: { lt: now },
                status: { in: OPEN_INVOICE_STATUSES },
              },
              orderBy: { dueDate: 'asc' },
              take: 2,
              select: { dueDate: true },
            },
          },
        },
      },
    });

    return candidates
      .filter((candidate) =>
        matchesOverdueDateFilters(candidate.contract.invoices, normalized),
      )
      .map((candidate) => candidate.id);
  }

  // Retorna TODOS os ids de casos que batem com os filtros (sem paginacao) —
  // usado pelo envio de HSM em lote "por filtro" (o supervisor customiza o
  // grupo via filtro, sem marcar caso por caso). Limitado por seguranca a
  // BULK_CONTACT_MAX_CASES.
  async listCaseIds(params: CollectionCasesListParams): Promise<string[]> {
    const normalized = normalizeListParams(params);
    const where = buildCollectionCasesWhere(normalized);
    const now = new Date();

    const dueDateFilteredIds = await this.resolveDueDateFilteredIds(
      where,
      normalized,
      now,
    );

    if (dueDateFilteredIds !== null) {
      if (dueDateFilteredIds.length === 0) return [];
      where.id = { in: dueDateFilteredIds };
    }

    const records = await this.prisma.collectionCase.findMany({
      where,
      select: { id: true },
      take: BULK_CONTACT_MAX_CASES,
    });

    return records.map((record) => record.id);
  }

  // Para o popover "quantos casos por data" ao lado dos campos de vencimento
  // (evita o supervisor ter que ir tentando data por data). Cada lista
  // respeita os demais filtros ativos e a data do OUTRO campo (ex.: ao
  // enumerar as opcoes de 1o vencimento, se o 2o vencimento ja estiver
  // preenchido, so contam os casos que tambem batem com ele) — mas nunca o
  // proprio campo que esta sendo enumerado, senao so a data ja escolhida
  // apareceria na lista.
  async getOverdueDateSummary(
    params: CollectionCasesListParams,
  ): Promise<OverdueDateSummaryResponse> {
    const normalized = normalizeListParams(params);
    const now = new Date();
    const baseWhere = buildCollectionCasesWhere(
      { ...normalized, firstDueDate: undefined, secondDueDate: undefined },
      now,
    );

    const candidates = await this.prisma.collectionCase.findMany({
      where: baseWhere,
      select: {
        contract: {
          select: {
            invoices: {
              where: {
                dueDate: { lt: now },
                status: { in: OPEN_INVOICE_STATUSES },
              },
              orderBy: { dueDate: 'asc' },
              take: 2,
              select: { dueDate: true },
            },
          },
        },
      },
    });

    const firstCounts = new Map<string, number>();
    const secondCounts = new Map<string, number>();

    for (const candidate of candidates) {
      const invoices = candidate.contract.invoices;
      const [first, second] = invoices;

      if (
        first &&
        matchesOverdueDateFilters(invoices, {
          secondDueDate: normalized.secondDueDate,
        })
      ) {
        const key = first.dueDate.toISOString().slice(0, 10);
        firstCounts.set(key, (firstCounts.get(key) ?? 0) + 1);
      }

      if (
        second &&
        matchesOverdueDateFilters(invoices, {
          firstDueDate: normalized.firstDueDate,
        })
      ) {
        const key = second.dueDate.toISOString().slice(0, 10);
        secondCounts.set(key, (secondCounts.get(key) ?? 0) + 1);
      }
    }

    const toSortedItems = (counts: Map<string, number>) =>
      Array.from(counts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
      firstDueDates: toSortedItems(firstCounts),
      secondDueDates: toSortedItems(secondCounts),
    };
  }

  async getCaseById(id: string) {
    const record = await this.prisma.collectionCase.findUnique({
      where: { id },
      include: collectionCaseDetailsInclude,
    });

    if (!record) {
      return null;
    }

    return this.mapDetails(record);
  }

  async getCaseTimeline(
    id: string,
  ): Promise<CollectionCaseTimelineResponse | null> {
    const [record, auditLogs] = await Promise.all([
      this.prisma.collectionCase.findUnique({
        where: { id },
        select: {
          id: true,
          createdAt: true,
          customer: { select: { name: true } },
          collectionAttempts: {
            include: {
              performedBy: { select: { name: true } },
            },
          },
          paymentPromises: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          entityType: 'COLLECTION_CASE',
          entityId: id,
        },
        include: {
          performedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!record) {
      return null;
    }

    const mappedAuditLogs = auditLogs.map(mapAuditLogToTimelineSource);

    return buildCollectionCaseTimeline({
      caseId: record.id,
      caseCreatedAt: record.createdAt,
      customerName: record.customer.name,
      attempts: record.collectionAttempts.map((attempt) => ({
        id: attempt.id,
        channel: attempt.channel,
        result: attempt.result,
        attemptedAt: attempt.attemptedAt,
        notes: attempt.notes,
        actorName: attempt.performedBy?.name ?? null,
      })),
      promises: record.paymentPromises.map((promise) => ({
        id: promise.id,
        promisedAmount: promise.promisedAmount,
        promisedDate: promise.promisedDate,
        notes: promise.notes,
        createdAt: promise.createdAt,
        fulfilledAt: promise.fulfilledAt,
        brokenAt: promise.brokenAt,
        cancelledAt: promise.cancelledAt,
        createdActorName: resolvePromiseActorFromAuditLogs(
          mappedAuditLogs,
          promise.id,
          'CREATE',
        ),
        fulfilledActorName: resolvePromiseActorFromAuditLogs(
          mappedAuditLogs,
          promise.id,
          'FULFILLED',
        ),
        brokenActorName: resolvePromiseActorFromAuditLogs(
          mappedAuditLogs,
          promise.id,
          'BROKEN',
        ),
        cancelledActorName: resolvePromiseActorFromAuditLogs(
          mappedAuditLogs,
          promise.id,
          'CANCELLED',
        ),
      })),
      cancellationSentEvents:
        resolveCancellationSentEventsFromAuditLogs(mappedAuditLogs),
      cancellationStepCompletedEvents:
        resolveCancellationStepCompletedEventsFromAuditLogs(mappedAuditLogs),
      cancellationProcessCompletedEvents:
        resolveCancellationProcessCompletedEventsFromAuditLogs(mappedAuditLogs),
      auditLogs: mappedAuditLogs,
    });
  }

  async sendToCancellation({
    caseId,
    input,
    performedByUserId,
  }: SendToCancellationParams): Promise<SendToCancellationResult> {
    const existingCase = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      include: {
        cancellationProcesses: true,
      },
    });

    if (!existingCase) {
      return { outcome: 'case_not_found' };
    }

    if (hasActiveCancellationProcess(existingCase.cancellationProcesses)) {
      return { outcome: 'already_in_cancellation' };
    }

    if (!canSendCollectionCaseToCancellation(existingCase.status)) {
      return {
        outcome: 'status_not_allowed',
        currentStatus: existingCase.status,
      };
    }

    const now = new Date();
    const beforeSnapshot: Prisma.InputJsonValue = {
      status: existingCase.status,
      cancellationProcess: null,
    };

    const createdProcess = await this.prisma.$transaction(async (tx) => {
      const process = await tx.cancellationProcess.create({
        data: {
          collectionCaseId: caseId,
          contractId: existingCase.contractId,
          customerId: existingCase.customerId,
          status: CancellationStatus.PENDING,
          startedAt: now,
        },
      });

      await tx.cancellationStep.createMany({
        data: buildDefaultCancellationStepsForPrisma(process.id),
      });

      await tx.collectionCase.update({
        where: { id: caseId },
        data: {
          status: CollectionStatus.CANCELLATION_IN_PROGRESS,
          updatedAt: now,
        },
      });

      const afterSnapshot: Prisma.InputJsonValue = {
        status: CollectionStatus.CANCELLATION_IN_PROGRESS,
        cancellationProcess: {
          id: process.id,
          status: process.status,
          startedAt: process.startedAt?.toISOString() ?? null,
        },
      };

      await tx.auditLog.create({
        data: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: AuditAction.STATUS_CHANGE,
          performedByUserId,
          beforeSnapshot,
          afterSnapshot,
          metadata: {
            cancellationProcessId: process.id,
            resourceType: 'CANCELLATION_PROCESS',
            reason: input.reason,
            notes: input.notes ?? null,
          },
        },
      });

      return process;
    });

    const response: CancellationProcessResponse = {
      id: createdProcess.id,
      collectionCaseId: caseId,
      status: createdProcess.status,
      reason: input.reason,
      notes: input.notes ?? null,
      startedAt: createdProcess.startedAt?.toISOString() ?? null,
      completedAt: createdProcess.completedAt?.toISOString() ?? null,
      createdAt: createdProcess.createdAt.toISOString(),
    };

    return { outcome: 'success', cancellationProcess: response };
  }

  async revertCancellation({
    caseId,
    input,
    performedByUserId,
  }: RevertCancellationParams): Promise<RevertCancellationResult> {
    const existingCase = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      include: {
        cancellationProcesses: true,
      },
    });

    if (!existingCase) {
      return { outcome: 'case_not_found' };
    }

    if (!canRevertCancellation(existingCase.status)) {
      return {
        outcome: 'status_not_allowed',
        currentStatus: existingCase.status,
      };
    }

    const now = new Date();
    // Credita o caso ao responsavel atual; se nao houver, atribui a quem reverteu.
    const creditedUserId = existingCase.assignedUserId ?? performedByUserId;
    const reversibleProcesses = existingCase.cancellationProcesses.filter(
      (process) => isReversibleCancellationProcess(process.status),
    );

    const beforeSnapshot: Prisma.InputJsonValue = {
      status: existingCase.status,
      recoveredAt: existingCase.recoveredAt?.toISOString() ?? null,
      assignedUserId: existingCase.assignedUserId,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.collectionCase.update({
        where: { id: caseId },
        data: {
          status: CollectionStatus.RECOVERED,
          recoveredAt: now,
          assignedUserId: creditedUserId,
          updatedAt: now,
        },
      });

      for (const process of reversibleProcesses) {
        await tx.cancellationProcess.update({
          where: { id: process.id },
          data: {
            status: CancellationStatus.CANCELLED,
            completedAt: now,
          },
        });
      }

      const afterSnapshot: Prisma.InputJsonValue = {
        status: CollectionStatus.RECOVERED,
        recoveredAt: now.toISOString(),
        assignedUserId: creditedUserId,
      };

      await tx.auditLog.create({
        data: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: AuditAction.STATUS_CHANGE,
          performedByUserId,
          beforeSnapshot,
          afterSnapshot,
          metadata: {
            resourceType: 'COLLECTION_CASE',
            action: 'REVERT_CANCELLATION',
            reason: input.reason,
            notes: input.notes ?? null,
            recoveredAmount: formatDecimal(existingCase.outstandingAmount),
            revertedCancellationProcessIds: reversibleProcesses.map(
              (process) => process.id,
            ),
          },
        },
      });
    });

    const details = await this.getCaseById(caseId);

    if (!details) {
      return { outcome: 'case_not_found' };
    }

    return { outcome: 'success', case: details };
  }

  async createAttempt({
    caseId,
    input,
    performedByUserId,
  }: CreateCollectionAttemptParams): Promise<CollectionAttemptResponse | null> {
    const existingCase = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!existingCase) {
      return null;
    }

    const now = new Date();

    const attempt = await this.prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.collectionAttempt.create({
        data: {
          collectionCaseId: caseId,
          performedByUserId,
          channel: input.channel,
          result: input.result,
          notes: input.notes ?? null,
          attemptedAt: now,
          nextContactAt: input.nextContactAt
            ? new Date(input.nextContactAt)
            : null,
        },
      });

      await tx.collectionCase.update({
        where: { id: caseId },
        data: { updatedAt: now },
      });

      const afterSnapshot: Prisma.InputJsonValue = {
        id: createdAttempt.id,
        collectionCaseId: caseId,
        channel: createdAttempt.channel,
        result: createdAttempt.result,
        attemptedAt: createdAttempt.attemptedAt.toISOString(),
        notes: createdAttempt.notes,
        nextContactAt: createdAttempt.nextContactAt?.toISOString() ?? null,
      };

      const metadata: Prisma.InputJsonValue = {
        attemptId: createdAttempt.id,
        nextContactAt: createdAttempt.nextContactAt?.toISOString() ?? null,
      };

      await tx.auditLog.create({
        data: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: AuditAction.CREATE,
          performedByUserId,
          beforeSnapshot: Prisma.DbNull,
          afterSnapshot,
          metadata,
        },
      });

      return createdAttempt;
    });

    return {
      id: attempt.id,
      collectionCaseId: caseId,
      channel: attempt.channel,
      result: attempt.result,
      attemptedAt: attempt.attemptedAt.toISOString(),
      notes: attempt.notes,
      nextContactAt: attempt.nextContactAt?.toISOString() ?? null,
      performedByUserId,
    };
  }

  async getContactContext(caseId: string) {
    const record = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        status: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        contract: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    return record;
  }

  async recordWhatsAppContactIntegration({
    caseId,
    performedByUserId,
    status,
    payload,
    matrixAttendanceCode,
    matrixMessageCode,
    errorMessage,
  }: RecordWhatsAppContactIntegrationParams): Promise<RecordWhatsAppContactIntegrationResult> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.collectionAttempt.create({
        data: {
          collectionCaseId: caseId,
          performedByUserId,
          channel: 'WHATSAPP',
          result: status === 'COMPLETED' ? 'CONTACTED' : 'OTHER',
          notes:
            status === 'COMPLETED'
              ? 'HSM Matrix solicitado via N8N.'
              : `Falha ao solicitar HSM Matrix via N8N.${errorMessage ? ` ${errorMessage}` : ''}`,
          attemptedAt: now,
        },
      });

      await tx.collectionCase.update({
        where: { id: caseId },
        data: {
          ...(status === 'COMPLETED'
            ? {
                matrixAttendanceCode: matrixAttendanceCode ?? undefined,
                matrixMessageCode: matrixMessageCode ?? undefined,
                matrixAwaitingReply: Boolean(matrixAttendanceCode),
                matrixLastOutboundAt: now,
              }
            : {}),
          updatedAt: now,
        } as Prisma.CollectionCaseUncheckedUpdateInput,
      });

      const integrationEvent = await tx.integrationEvent.create({
        data: {
          source: 'n8n_matrix',
          eventType: 'collection_cases.whatsapp_hsm',
          status:
            status === 'COMPLETED'
              ? IntegrationEventStatus.COMPLETED
              : IntegrationEventStatus.FAILED,
          payload: {
            ...payload,
            attemptId: attempt.id,
          },
          errorMessage: errorMessage ?? null,
          processedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: AuditAction.INTEGRATION,
          performedByUserId,
          beforeSnapshot: Prisma.DbNull,
          afterSnapshot: {
            attemptId: attempt.id,
            integrationEventId: integrationEvent.id,
            status,
            channel: 'WHATSAPP',
            provider: 'n8n_matrix',
            matrixAttendanceCode: matrixAttendanceCode ?? null,
            matrixMessageCode: matrixMessageCode ?? null,
            sentAt: now.toISOString(),
          },
          metadata: {
            resourceType: 'COLLECTION_ATTEMPT',
            attemptId: attempt.id,
            integrationEventId: integrationEvent.id,
            provider: 'n8n_matrix',
            matrixAttendanceCode: matrixAttendanceCode ?? null,
            matrixMessageCode: matrixMessageCode ?? null,
          },
        },
      });

      return {
        attemptId: attempt.id,
        integrationEventId: integrationEvent.id,
        matrixAttendanceCode: matrixAttendanceCode ?? null,
        matrixMessageCode: matrixMessageCode ?? null,
      };
    });
  }

  async createPromise({
    caseId,
    input,
    createdByUserId,
  }: CreatePaymentPromiseParams): Promise<PaymentPromiseResponse | null> {
    const existingCase = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!existingCase) {
      return null;
    }

    const now = new Date();

    const promise = await this.prisma.$transaction(async (tx) => {
      const createdPromise = await tx.paymentPromise.create({
        data: {
          collectionCaseId: caseId,
          promisedAmount: new Prisma.Decimal(input.promisedAmount),
          promisedDate: new Date(input.promisedDate),
          notes: input.notes ?? null,
          status: PaymentPromiseStatus.ACTIVE,
        },
      });

      await tx.collectionCase.update({
        where: { id: caseId },
        data: { updatedAt: now },
      });

      const afterSnapshot: Prisma.InputJsonValue = {
        id: createdPromise.id,
        collectionCaseId: caseId,
        status: createdPromise.status,
        promisedAmount: formatDecimal(createdPromise.promisedAmount),
        promisedDate: createdPromise.promisedDate.toISOString(),
        notes: createdPromise.notes,
        createdAt: createdPromise.createdAt.toISOString(),
      };

      await tx.auditLog.create({
        data: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: AuditAction.CREATE,
          performedByUserId: createdByUserId,
          beforeSnapshot: Prisma.DbNull,
          afterSnapshot,
          metadata: {
            promiseId: createdPromise.id,
            resourceType: 'PAYMENT_PROMISE',
          },
        },
      });

      return createdPromise;
    });

    return mapPaymentPromiseToResponse(promise, createdByUserId);
  }

  async updatePromiseStatus({
    caseId,
    promiseId,
    action,
    input,
    performedByUserId,
  }: UpdatePaymentPromiseStatusParams): Promise<UpdatePaymentPromiseStatusResult> {
    const existingCase = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!existingCase) {
      return { outcome: 'case_not_found' };
    }

    const existingPromise = await this.prisma.paymentPromise.findFirst({
      where: {
        id: promiseId,
        collectionCaseId: caseId,
      },
    });

    if (!existingPromise) {
      return { outcome: 'promise_not_found' };
    }

    if (existingPromise.status !== PaymentPromiseStatus.ACTIVE) {
      return {
        outcome: 'invalid_transition',
        currentStatus: existingPromise.status,
      };
    }

    const now = new Date();
    const statusUpdate = buildPaymentPromiseStatusUpdateData(action, now);
    const mergedNotes = mergePaymentPromiseNotes(
      existingPromise.notes,
      input?.notes,
    );

    const beforeSnapshot: Prisma.InputJsonValue = {
      id: existingPromise.id,
      collectionCaseId: caseId,
      status: existingPromise.status,
      promisedAmount: formatDecimal(existingPromise.promisedAmount),
      promisedDate: existingPromise.promisedDate.toISOString(),
      notes: existingPromise.notes,
      fulfilledAt: existingPromise.fulfilledAt?.toISOString() ?? null,
      brokenAt: existingPromise.brokenAt?.toISOString() ?? null,
      cancelledAt: existingPromise.cancelledAt?.toISOString() ?? null,
    };

    const updatedPromise = await this.prisma.$transaction(async (tx) => {
      const promise = await tx.paymentPromise.update({
        where: { id: promiseId },
        data: {
          ...statusUpdate,
          notes: mergedNotes,
        },
      });

      await tx.collectionCase.update({
        where: { id: caseId },
        data: { updatedAt: now },
      });

      const afterSnapshot: Prisma.InputJsonValue = {
        id: promise.id,
        collectionCaseId: caseId,
        status: promise.status,
        promisedAmount: formatDecimal(promise.promisedAmount),
        promisedDate: promise.promisedDate.toISOString(),
        notes: promise.notes,
        fulfilledAt: promise.fulfilledAt?.toISOString() ?? null,
        brokenAt: promise.brokenAt?.toISOString() ?? null,
        cancelledAt: promise.cancelledAt?.toISOString() ?? null,
      };

      await tx.auditLog.create({
        data: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: AuditAction.STATUS_CHANGE,
          performedByUserId,
          beforeSnapshot,
          afterSnapshot,
          metadata: {
            promiseId: promise.id,
            resourceType: 'PAYMENT_PROMISE',
            action,
          },
        },
      });

      return promise;
    });

    return {
      outcome: 'success',
      promise: mapPaymentPromiseToResponse(updatedPromise, performedByUserId),
    };
  }

  async assignCase({
    caseId,
    assignedUserId,
    performedByUserId,
  }: AssignCaseParams): Promise<AssignCaseResult> {
    const existingCase = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      select: { id: true, assignedUserId: true },
    });

    if (!existingCase) {
      return { outcome: 'case_not_found' };
    }

    if (assignedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: assignedUserId },
        select: {
          id: true,
          status: true,
          userRoles: { select: { role: { select: { code: true } } } },
        },
      });

      if (
        !user ||
        user.status !== UserStatus.ACTIVE ||
        !hasAssignableCaseRole(user)
      ) {
        return { outcome: 'user_not_found' };
      }
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.collectionCase.update({
        where: { id: caseId },
        data: { assignedUserId, updatedAt: now },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'COLLECTION_CASE',
          entityId: caseId,
          action: AuditAction.UPDATE,
          performedByUserId,
          beforeSnapshot: { assignedUserId: existingCase.assignedUserId },
          afterSnapshot: { assignedUserId },
          metadata: {
            resourceType: 'COLLECTION_CASE',
            field: 'assignedUserId',
          },
        },
      });
    });

    const details = await this.getCaseById(caseId);

    if (!details) {
      return { outcome: 'case_not_found' };
    }

    return { outcome: 'success', case: details };
  }

  async bulkAssignCases({
    caseIds,
    assignedUserId,
    performedByUserId,
  }: BulkAssignCasesParams): Promise<BulkAssignCasesResult> {
    if (assignedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: assignedUserId },
        select: {
          id: true,
          status: true,
          userRoles: { select: { role: { select: { code: true } } } },
        },
      });
      if (
        !user ||
        user.status !== UserStatus.ACTIVE ||
        !hasAssignableCaseRole(user)
      ) {
        return { assigned: 0, skipped: caseIds.length };
      }
    }

    const existing = await this.prisma.collectionCase.findMany({
      where: { id: { in: caseIds } },
      select: { id: true, assignedUserId: true },
    });

    const existingMap = new Map(existing.map((c) => [c.id, c]));
    const validIds = caseIds.filter((id) => existingMap.has(id));
    const now = new Date();

    if (validIds.length === 0) {
      return { assigned: 0, skipped: caseIds.length };
    }

    await this.prisma.$transaction([
      this.prisma.collectionCase.updateMany({
        where: { id: { in: validIds } },
        data: { assignedUserId, updatedAt: now },
      }),
      ...validIds.map((id) =>
        this.prisma.auditLog.create({
          data: {
            entityType: 'COLLECTION_CASE',
            entityId: id,
            action: AuditAction.UPDATE,
            performedByUserId,
            beforeSnapshot: { assignedUserId: existingMap.get(id)?.assignedUserId ?? null },
            afterSnapshot: { assignedUserId },
            metadata: { resourceType: 'COLLECTION_CASE', field: 'assignedUserId', bulk: true },
          },
        }),
      ),
    ]);

    return { assigned: validIds.length, skipped: caseIds.length - validIds.length };
  }

  async autoDistributeCases({
    statuses,
    targetRole,
    performedByUserId,
  }: AutoDistributeCasesParams): Promise<AutoDistributeCasesResult> {
    const cases = await this.prisma.collectionCase.findMany({
      where: {
        status: { in: statuses as any[] },
        assignedUserId: null,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (cases.length === 0) {
      return { distributed: 0, agents: 0 };
    }

    const agents = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        userRoles: { some: { role: { code: targetRole } } },
      },
      select: { id: true },
      orderBy: { name: 'asc' },
    });

    if (agents.length === 0) {
      return { distributed: 0, agents: 0 };
    }

    const now = new Date();

    const assignments = cases.map((c, i) => ({
      caseId: c.id,
      agentId: agents[i % agents.length]!.id,
    }));

    const byAgent = new Map<string, string[]>();
    for (const { caseId, agentId } of assignments) {
      const list = byAgent.get(agentId) ?? [];
      list.push(caseId);
      byAgent.set(agentId, list);
    }

    await this.prisma.$transaction([
      ...Array.from(byAgent.entries()).map(([agentId, ids]) =>
        this.prisma.collectionCase.updateMany({
          where: { id: { in: ids } },
          data: { assignedUserId: agentId, updatedAt: now },
        }),
      ),
      ...assignments.map(({ caseId, agentId }) =>
        this.prisma.auditLog.create({
          data: {
            entityType: 'COLLECTION_CASE',
            entityId: caseId,
            action: AuditAction.UPDATE,
            performedByUserId,
            beforeSnapshot: { assignedUserId: null },
            afterSnapshot: { assignedUserId: agentId },
            metadata: { resourceType: 'COLLECTION_CASE', field: 'assignedUserId', autoDistribute: true },
          },
        }),
      ),
    ]);

    return { distributed: cases.length, agents: agents.length };
  }

  private mapDetails(
    record: CollectionCaseWithRelations,
  ): CollectionCaseDetailsResponse {
    const matrix = record as CollectionCaseWithRelations & MatrixTrackingFields;
    const attempts = record.collectionAttempts.map((attempt) => ({
      id: attempt.id,
      channel: attempt.channel,
      result: attempt.result,
      attemptedAt: attempt.attemptedAt.toISOString(),
      notes: attempt.notes,
      nextContactAt: attempt.nextContactAt?.toISOString() ?? null,
    }));

    const promises = record.paymentPromises.map((promise) => ({
      id: promise.id,
      status: promise.status,
      promisedAmount: formatDecimal(promise.promisedAmount),
      promisedDate: promise.promisedDate.toISOString(),
      notes: promise.notes,
      fulfilledAt: promise.fulfilledAt?.toISOString() ?? null,
      brokenAt: promise.brokenAt?.toISOString() ?? null,
      cancelledAt: promise.cancelledAt?.toISOString() ?? null,
      createdAt: promise.createdAt.toISOString(),
    }));

    const activePromise =
      promises.find(
        (promise) => promise.status === PaymentPromiseStatus.ACTIVE,
      ) ?? null;

    const invoices = record.contract.invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      amount: formatDecimal(invoice.amount),
      paidAmount: formatDecimal(invoice.paidAmount),
    }));

    const totalOutstanding = invoices.reduce((total, invoice) => {
      const amount = Number(invoice.amount);
      const paidAmount = Number(invoice.paidAmount);
      return total + Math.max(amount - paidAmount, 0);
    }, 0);

    const cancellation = record.cancellationProcesses[0];

    const mapStepMetadata = (metadata: unknown) => {
      if (
        !metadata ||
        typeof metadata !== 'object' ||
        Array.isArray(metadata)
      ) {
        return null;
      }

      return metadata as Record<string, unknown>;
    };

    return {
      id: record.id,
      customer: {
        id: record.customer.id,
        name: record.customer.name,
        document: record.customer.document,
        phone: record.customer.phone,
      },
      contract: {
        id: record.contract.id,
        code: record.contract.code,
        status: record.contract.status,
      },
      status: record.status,
      priority: record.priority,
      daysOverdue: record.daysOverdue,
      outstandingAmount: formatDecimal(record.outstandingAmount),
      totalOutstanding:
        totalOutstanding > 0
          ? totalOutstanding.toFixed(2)
          : formatDecimal(record.outstandingAmount),
      assignedTo: record.assignedUser
        ? {
            id: record.assignedUser.id,
            name: record.assignedUser.name,
          }
        : null,
      slaDueAt: record.slaDueAt?.toISOString() ?? null,
      recentAttempts: attempts.slice(0, 5),
      attempts,
      activePromise,
      promises,
      invoices,
      matrixContact: {
        attendanceCode: matrix.matrixAttendanceCode ?? null,
        messageCode: matrix.matrixMessageCode ?? null,
        awaitingReply: matrix.matrixAwaitingReply ?? false,
        lastOutboundAt: matrix.matrixLastOutboundAt?.toISOString() ?? null,
        lastReplyAt: matrix.matrixLastReplyAt?.toISOString() ?? null,
      },
      cancellationProcess: cancellation
        ? {
            id: cancellation.id,
            status: cancellation.status,
            startedAt: cancellation.startedAt?.toISOString() ?? null,
            completedAt: cancellation.completedAt?.toISOString() ?? null,
            steps: cancellation.steps.map((step) => {
              const metadata = mapStepMetadata(step.metadata);

              return {
                id: step.id,
                stepCode: step.name,
                name: getCancellationStepLabel(step.name),
                stepOrder: step.stepOrder,
                status: step.status,
                externalProtocol: step.externalId ?? null,
                completedAt: step.completedAt?.toISOString() ?? null,
                completedByName:
                  typeof metadata?.completedByName === 'string'
                    ? metadata.completedByName
                    : null,
              };
            }),
          }
        : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
