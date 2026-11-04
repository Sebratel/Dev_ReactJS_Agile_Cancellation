import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type { CollectionAttemptResponse } from '@/modules/collection-cases/dto/collection-attempt.response';
import {
  mockCollectionCaseDetails,
  mockCollectionCaseListRecords,
  pushMockAuditLog,
  mockAuditLogs,
  resolveMockActorName,
} from '@/modules/collection-cases/mocks/collection-cases.mock';
import type {
  AssignCaseParams,
  AssignCaseResult,
  AutoDistributeCasesResult,
  BulkAssignCasesParams,
  BulkAssignCasesResult,
} from '@/modules/collection-cases/repositories/collection-cases.repository';
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
import { buildDefaultCancellationStepsForMock } from '@/modules/cancellations/utils/create-default-cancellation-steps.util';
import type { PaymentPromiseResponse } from '@/modules/collection-cases/dto/payment-promise.response';
import type {
  CollectionCaseIntakeSummary,
  CollectionCasesListParams,
  CollectionCasesRepository,
  CreateCollectionAttemptParams,
  CreatePaymentPromiseParams,
  RecordWhatsAppContactIntegrationParams,
  RecordWhatsAppContactIntegrationResult,
  RecoverCancelledParams,
  RecoverCancelledResult,
  RevertCancellationParams,
  RevertCancellationResult,
  SendToCancellationParams,
  SendToCancellationResult,
  UpdatePaymentPromiseStatusParams,
  UpdatePaymentPromiseStatusResult,
} from '@/modules/collection-cases/repositories/collection-cases.repository';
import type { CancellationProcessResponse } from '@/modules/collection-cases/dto/cancellation-process.response';
import type { OverdueDateSummaryResponse } from '@/modules/collection-cases/dto/overdue-date-summary.response';
import type {
  CollectionCasePortfolioSummary,
  CollectionCasePortfoliosResponse,
} from '@/modules/collection-cases/dto/collection-case-portfolio.response';
import {
  filterMockCollectionCases,
  normalizeListParams,
  sortMockCollectionCases,
  toListItemResponse,
} from '@/modules/collection-cases/utils/collection-cases-list.utils';

@Injectable()
export class CollectionCasesMockRepository implements CollectionCasesRepository {
  listCases(params: CollectionCasesListParams) {
    const normalized = normalizeListParams(params);
    const filtered = filterMockCollectionCases(
      mockCollectionCaseListRecords,
      normalized,
    );
    const sorted = sortMockCollectionCases(filtered, normalized);
    const startIndex = (normalized.page - 1) * normalized.limit;
    const items = sorted
      .slice(startIndex, startIndex + normalized.limit)
      .map(toListItemResponse);

    return Promise.resolve(
      createPaginatedResponse(
        items,
        normalized.page,
        normalized.limit,
        sorted.length,
      ),
    );
  }

  listCaseIds(params: CollectionCasesListParams): Promise<string[]> {
    const normalized = normalizeListParams(params);
    const filtered = filterMockCollectionCases(
      mockCollectionCaseListRecords,
      normalized,
    );

    return Promise.resolve(filtered.map((record) => record.id));
  }

  getOverdueDateSummary(
    params: CollectionCasesListParams,
  ): Promise<OverdueDateSummaryResponse> {
    const normalized = normalizeListParams(params);

    // Cada lista respeita os demais filtros + a data do OUTRO campo, mas
    // ignora o proprio campo que esta sendo enumerado (mesma logica do
    // repositorio Prisma — ver comentario la).
    const candidatesForFirst = filterMockCollectionCases(
      mockCollectionCaseListRecords,
      { ...normalized, firstDueDate: undefined },
    );
    const candidatesForSecond = filterMockCollectionCases(
      mockCollectionCaseListRecords,
      { ...normalized, secondDueDate: undefined },
    );

    const firstCounts = new Map<string, number>();
    for (const record of candidatesForFirst) {
      if (!record.firstOverdueDate) continue;
      const key = record.firstOverdueDate.slice(0, 10);
      firstCounts.set(key, (firstCounts.get(key) ?? 0) + 1);
    }

    const secondCounts = new Map<string, number>();
    for (const record of candidatesForSecond) {
      if (!record.secondOverdueDate) continue;
      const key = record.secondOverdueDate.slice(0, 10);
      secondCounts.set(key, (secondCounts.get(key) ?? 0) + 1);
    }

    const toSortedItems = (counts: Map<string, number>) =>
      Array.from(counts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return Promise.resolve({
      firstDueDates: toSortedItems(firstCounts),
      secondDueDates: toSortedItems(secondCounts),
    });
  }

  getPortfolios(): Promise<CollectionCasePortfoliosResponse> {
    const ACTIVE_STATUSES = new Set([
      'WAITING_TRIAGE',
      'IN_COLLECTION',
      'NO_RESPONSE',
      'ELIGIBLE_FOR_CANCELLATION',
      'CANCELLATION_IN_PROGRESS',
    ]);
    const now = Date.now();

    type Bucket = Omit<
      CollectionCasePortfolioSummary,
      'totalOutstanding' | 'totalAssigned' | 'interacted'
    > & {
      outstanding: number;
    };
    const buckets = new Map<string | null, Bucket>();

    // Interagidos (contato manual = totalAttempts > 1, alem da automatica
    // inicial) entre os casos ATIVOS, por atendente.
    const interactedByKey = new Map<string | null, number>();
    for (const record of mockCollectionCaseListRecords) {
      const key = record.assignedUserId;
      if (ACTIVE_STATUSES.has(record.status) && record.totalAttempts > 1) {
        interactedByKey.set(key, (interactedByKey.get(key) ?? 0) + 1);
      }
    }

    for (const record of mockCollectionCaseListRecords) {
      if (!ACTIVE_STATUSES.has(record.status)) {
        continue;
      }

      const key = record.assignedUserId;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          agent: record.assignedTo
            ? {
                id: record.assignedTo.id,
                name: record.assignedTo.name,
                avatarUrl: null,
              }
            : null,
          totalActive: 0,
          slaOverdue: 0,
          awaitingReply: 0,
          noManualInteraction: 0,
          outstanding: 0,
        };
        buckets.set(key, bucket);
      }

      bucket.totalActive += 1;
      bucket.outstanding += Number(record.outstandingAmount);

      if (record.slaDueAt && new Date(record.slaDueAt).getTime() < now) {
        bucket.slaOverdue += 1;
      }

      if (record.matrixAwaitingReply) {
        bucket.awaitingReply += 1;
      }

      // So a tentativa automatica inicial (totalAttempts <= 1) = nao trabalhado.
      if (record.totalAttempts <= 1) {
        bucket.noManualInteraction += 1;
      }
    }

    const portfolios: CollectionCasePortfolioSummary[] = Array.from(
      buckets.entries(),
    ).map(([key, bucket]) => ({
      agent: bucket.agent,
      totalActive: bucket.totalActive,
      totalAssigned: bucket.totalActive,
      interacted: interactedByKey.get(key) ?? 0,
      slaOverdue: bucket.slaOverdue,
      awaitingReply: bucket.awaitingReply,
      noManualInteraction: bucket.noManualInteraction,
      totalOutstanding: bucket.outstanding.toFixed(2),
    }));

    return Promise.resolve({ portfolios });
  }

  getStatusSummary(): Promise<Record<string, number>> {
    const byStatus: Record<string, number> = {};
    for (const record of mockCollectionCaseListRecords) {
      byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
    }
    return Promise.resolve(byStatus);
  }

  getIntakeSummary(
    now: Date = new Date(),
  ): Promise<CollectionCaseIntakeSummary> {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    let today = 0;
    let yesterday = 0;
    for (const record of mockCollectionCaseListRecords) {
      const createdAt = new Date(record.createdAt).getTime();
      if (
        createdAt >= todayStart.getTime() &&
        createdAt < tomorrowStart.getTime()
      ) {
        today += 1;
      } else if (
        createdAt >= yesterdayStart.getTime() &&
        createdAt < todayStart.getTime()
      ) {
        yesterday += 1;
      }
    }

    return Promise.resolve({ today, yesterday });
  }

  getCaseById(id: string) {
    return Promise.resolve(mockCollectionCaseDetails[id] ?? null);
  }

  getCaseTimeline(id: string): Promise<CollectionCaseTimelineResponse | null> {
    const details = mockCollectionCaseDetails[id];

    if (!details) {
      return Promise.resolve(null);
    }

    const attempts =
      details.attempts.length > 0 ? details.attempts : details.recentAttempts;

    const mappedAuditLogs = mockAuditLogs
      .filter((audit) => audit.entityId === id)
      .map((audit, index) => {
        const afterSnapshot = audit.afterSnapshot;
        const createdAt =
          typeof afterSnapshot.attemptedAt === 'string'
            ? afterSnapshot.attemptedAt
            : typeof afterSnapshot.createdAt === 'string'
              ? afterSnapshot.createdAt
              : typeof afterSnapshot.fulfilledAt === 'string'
                ? afterSnapshot.fulfilledAt
                : typeof afterSnapshot.brokenAt === 'string'
                  ? afterSnapshot.brokenAt
                  : typeof afterSnapshot.cancelledAt === 'string'
                    ? afterSnapshot.cancelledAt
                    : new Date().toISOString();

        return mapAuditLogToTimelineSource({
          id: `mock_audit_${id}_${index}`,
          action: audit.action,
          createdAt,
          performedByUserId: audit.performedByUserId,
          performedBy: audit.performedByUserId
            ? {
                name:
                  resolveMockActorName(audit.performedByUserId) ??
                  audit.performedByUserId,
              }
            : null,
          metadata: audit.metadata,
          beforeSnapshot: audit.beforeSnapshot,
          afterSnapshot: audit.afterSnapshot,
        });
      });

    const timeline = buildCollectionCaseTimeline({
      caseId: details.id,
      caseCreatedAt: details.createdAt,
      customerName: details.customer.name,
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        channel: attempt.channel,
        result: attempt.result,
        attemptedAt: attempt.attemptedAt,
        notes: attempt.notes ?? null,
        actorName: null,
        isAutomatic: attempt.isAutomatic ?? false,
      })),
      promises: details.promises.map((promise) => ({
        id: promise.id,
        promisedAmount: promise.promisedAmount,
        promisedDate: promise.promisedDate,
        notes: promise.notes ?? null,
        createdAt: promise.createdAt ?? details.createdAt,
        fulfilledAt: promise.fulfilledAt ?? null,
        brokenAt: promise.brokenAt ?? null,
        cancelledAt: promise.cancelledAt ?? null,
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

    return Promise.resolve(timeline);
  }

  createAttempt({
    caseId,
    input,
    performedByUserId,
  }: CreateCollectionAttemptParams): Promise<CollectionAttemptResponse | null> {
    const details = mockCollectionCaseDetails[caseId];

    if (!details) {
      return Promise.resolve(null);
    }

    const now = new Date().toISOString();
    const attemptId = `att_${Date.now()}`;
    const isAutomatic = input.isAutomatic ?? false;
    const attemptSummary = {
      id: attemptId,
      channel: input.channel,
      result: input.result,
      attemptedAt: now,
      notes: input.notes ?? null,
      nextContactAt: input.nextContactAt ?? null,
      isAutomatic,
    };

    details.attempts = [attemptSummary, ...details.attempts];
    details.recentAttempts = details.attempts.slice(0, 5);
    details.updatedAt = now;

    const response: CollectionAttemptResponse = {
      id: attemptId,
      collectionCaseId: caseId,
      channel: input.channel,
      result: input.result,
      attemptedAt: now,
      notes: input.notes ?? null,
      nextContactAt: input.nextContactAt ?? null,
      performedByUserId,
      isAutomatic,
    };

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: caseId,
      action: 'CREATE',
      performedByUserId,
      beforeSnapshot: null,
      afterSnapshot: {
        id: attemptId,
        collectionCaseId: caseId,
        channel: input.channel,
        result: input.result,
        attemptedAt: now,
        notes: input.notes ?? null,
        ...(input.nextContactAt ? { nextContactAt: input.nextContactAt } : {}),
      },
      metadata: {
        attemptId,
        ...(input.nextContactAt ? { nextContactAt: input.nextContactAt } : {}),
      },
    });

    return Promise.resolve(response);
  }

  getContactContext(caseId: string) {
    const details = mockCollectionCaseDetails[caseId];

    if (!details) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      id: details.id,
      status: details.status,
      customer: {
        id: details.customer.id,
        name: details.customer.name,
        phone: details.customer.phone,
      },
      contract: {
        id: details.contract.id,
        code: details.contract.code,
      },
    });
  }

  recordWhatsAppContactIntegration({
    caseId,
    performedByUserId,
    status,
    payload,
    matrixAttendanceCode,
    matrixMessageCode,
    errorMessage,
  }: RecordWhatsAppContactIntegrationParams): Promise<RecordWhatsAppContactIntegrationResult> {
    const now = new Date().toISOString();
    const attemptId = `att_matrix_${Date.now()}`;
    const integrationEventId = `evt_matrix_${Date.now()}`;
    const details = mockCollectionCaseDetails[caseId];

    if (details) {
      const attempt = {
        id: attemptId,
        channel: 'WHATSAPP',
        result: status === 'COMPLETED' ? 'CONTACTED' : 'OTHER',
        attemptedAt: now,
        notes:
          status === 'COMPLETED'
            ? 'HSM Matrix solicitado via N8N.'
            : `Falha ao solicitar HSM Matrix via N8N.${errorMessage ? ` ${errorMessage}` : ''}`,
        nextContactAt: null,
        isAutomatic: false,
      };

      details.attempts = [attempt, ...details.attempts];
      details.recentAttempts = details.attempts.slice(0, 5);
      details.matrixContact = {
        attendanceCode: matrixAttendanceCode ?? null,
        messageCode: matrixMessageCode ?? null,
        awaitingReply: status === 'COMPLETED' && Boolean(matrixAttendanceCode),
        lastOutboundAt:
          status === 'COMPLETED' ? now : details.matrixContact.lastOutboundAt,
        lastReplyAt: details.matrixContact.lastReplyAt,
      };
      details.updatedAt = now;
    }

    const record = mockCollectionCaseListRecords.find(
      (item) => item.id === caseId,
    );

    if (record) {
      record.matrixAwaitingReply =
        status === 'COMPLETED' && Boolean(matrixAttendanceCode);
      record.matrixLastOutboundAt =
        status === 'COMPLETED' ? now : record.matrixLastOutboundAt;
      record.updatedAt = now;
    }

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: caseId,
      action: 'INTEGRATION',
      performedByUserId,
      beforeSnapshot: null,
      afterSnapshot: {
        attemptId,
        integrationEventId,
        status,
        channel: 'WHATSAPP',
        provider: 'n8n_matrix',
        matrixAttendanceCode: matrixAttendanceCode ?? null,
        matrixMessageCode: matrixMessageCode ?? null,
        sentAt: now,
      },
      metadata: {
        provider: 'n8n_matrix',
        matrixAttendanceCode: matrixAttendanceCode ?? null,
        matrixMessageCode: matrixMessageCode ?? null,
        payload,
      },
    });

    return Promise.resolve({
      attemptId,
      integrationEventId,
      matrixAttendanceCode: matrixAttendanceCode ?? null,
      matrixMessageCode: matrixMessageCode ?? null,
    });
  }

  createPromise({
    caseId,
    input,
    createdByUserId,
  }: CreatePaymentPromiseParams): Promise<PaymentPromiseResponse | null> {
    const details = mockCollectionCaseDetails[caseId];

    if (!details) {
      return Promise.resolve(null);
    }

    const now = new Date().toISOString();
    const promiseId = `prm_${Date.now()}`;
    const promiseSummary = {
      id: promiseId,
      status: 'ACTIVE',
      promisedAmount: input.promisedAmount.toFixed(2),
      promisedDate: new Date(input.promisedDate).toISOString(),
      notes: input.notes ?? null,
      createdAt: now,
    };

    details.promises = [promiseSummary, ...details.promises];
    details.activePromise = promiseSummary;
    details.updatedAt = now;

    const response: PaymentPromiseResponse = {
      id: promiseId,
      collectionCaseId: caseId,
      status: 'ACTIVE',
      promisedAmount: promiseSummary.promisedAmount,
      promisedDate: promiseSummary.promisedDate,
      notes: input.notes ?? null,
      fulfilledAt: null,
      brokenAt: null,
      cancelledAt: null,
      createdAt: now,
      createdByUserId,
    };

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: caseId,
      action: 'CREATE',
      performedByUserId: createdByUserId,
      beforeSnapshot: null,
      afterSnapshot: {
        id: promiseId,
        collectionCaseId: caseId,
        status: 'ACTIVE',
        promisedAmount: promiseSummary.promisedAmount,
        promisedDate: promiseSummary.promisedDate,
        notes: input.notes ?? null,
        createdAt: now,
      },
      metadata: {
        promiseId,
        resourceType: 'PAYMENT_PROMISE',
      },
    });

    return Promise.resolve(response);
  }

  updatePromiseStatus({
    caseId,
    promiseId,
    action,
    input,
    performedByUserId,
  }: UpdatePaymentPromiseStatusParams): Promise<UpdatePaymentPromiseStatusResult> {
    const details = mockCollectionCaseDetails[caseId];

    if (!details) {
      return Promise.resolve({ outcome: 'case_not_found' });
    }

    const promiseIndex = details.promises.findIndex(
      (promise) => promise.id === promiseId,
    );

    if (promiseIndex === -1) {
      return Promise.resolve({ outcome: 'promise_not_found' });
    }

    const existingPromise = details.promises[promiseIndex];

    if (!existingPromise) {
      return Promise.resolve({ outcome: 'promise_not_found' });
    }

    if (existingPromise.status !== 'ACTIVE') {
      return Promise.resolve({
        outcome: 'invalid_transition',
        currentStatus: existingPromise.status,
      });
    }

    const now = new Date().toISOString();
    const targetStatus =
      action === 'FULFILLED'
        ? 'FULFILLED'
        : action === 'BROKEN'
          ? 'BROKEN'
          : 'CANCELLED';

    const mergedNotes =
      input?.notes?.trim() && existingPromise.notes?.trim()
        ? `${existingPromise.notes}\n${input.notes.trim()}`
        : (input?.notes?.trim() ?? existingPromise.notes ?? null);

    const updatedPromise = {
      ...existingPromise,
      status: targetStatus,
      notes: mergedNotes,
      fulfilledAt:
        action === 'FULFILLED' ? now : (existingPromise.fulfilledAt ?? null),
      brokenAt: action === 'BROKEN' ? now : (existingPromise.brokenAt ?? null),
      cancelledAt:
        action === 'CANCELLED' ? now : (existingPromise.cancelledAt ?? null),
    };

    details.promises[promiseIndex] = updatedPromise;
    details.activePromise =
      details.promises.find((promise) => promise.status === 'ACTIVE') ?? null;
    details.updatedAt = now;

    const beforeSnapshot = {
      id: existingPromise.id,
      collectionCaseId: caseId,
      status: existingPromise.status,
      promisedAmount: existingPromise.promisedAmount,
      promisedDate: existingPromise.promisedDate,
      notes: existingPromise.notes ?? null,
      fulfilledAt: existingPromise.fulfilledAt ?? null,
      brokenAt: existingPromise.brokenAt ?? null,
      cancelledAt: existingPromise.cancelledAt ?? null,
    };

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: caseId,
      action: 'STATUS_CHANGE',
      performedByUserId,
      beforeSnapshot,
      afterSnapshot: {
        id: updatedPromise.id,
        collectionCaseId: caseId,
        status: updatedPromise.status,
        promisedAmount: updatedPromise.promisedAmount,
        promisedDate: updatedPromise.promisedDate,
        notes: updatedPromise.notes ?? null,
        fulfilledAt: updatedPromise.fulfilledAt ?? null,
        brokenAt: updatedPromise.brokenAt ?? null,
        cancelledAt: updatedPromise.cancelledAt ?? null,
      },
      metadata: {
        promiseId: updatedPromise.id,
        resourceType: 'PAYMENT_PROMISE',
        action,
      },
    });

    const response: PaymentPromiseResponse = {
      id: updatedPromise.id,
      collectionCaseId: caseId,
      status: updatedPromise.status,
      promisedAmount: updatedPromise.promisedAmount,
      promisedDate: updatedPromise.promisedDate,
      notes: updatedPromise.notes ?? null,
      fulfilledAt: updatedPromise.fulfilledAt ?? null,
      brokenAt: updatedPromise.brokenAt ?? null,
      cancelledAt: updatedPromise.cancelledAt ?? null,
      createdAt: updatedPromise.createdAt ?? now,
      createdByUserId: performedByUserId,
    };

    return Promise.resolve({ outcome: 'success', promise: response });
  }

  sendToCancellation({
    caseId,
    input,
    performedByUserId,
  }: SendToCancellationParams): Promise<SendToCancellationResult> {
    const details = mockCollectionCaseDetails[caseId];

    if (!details) {
      return Promise.resolve({ outcome: 'case_not_found' });
    }

    if (
      details.cancellationProcess &&
      hasActiveCancellationProcess([details.cancellationProcess])
    ) {
      return Promise.resolve({ outcome: 'already_in_cancellation' });
    }

    if (!canSendCollectionCaseToCancellation(details.status)) {
      return Promise.resolve({
        outcome: 'status_not_allowed',
        currentStatus: details.status,
      });
    }

    const now = new Date().toISOString();
    const processId = `can_${Date.now()}`;
    const beforeSnapshot = {
      status: details.status,
      cancellationProcess: details.cancellationProcess,
    };

    details.status = 'CANCELLATION_IN_PROGRESS';
    details.cancellationProcess = {
      id: processId,
      status: 'PENDING',
      startedAt: now,
      completedAt: null,
      steps: buildDefaultCancellationStepsForMock(processId),
    };
    // Como no repositorio Prisma: o caso passa a ser do agente de cancelamento.
    details.assignedTo = {
      id: input.assignedUserId,
      name: resolveMockActorName(input.assignedUserId) ?? input.assignedUserId,
    };
    const listRecord = mockCollectionCaseListRecords.find(
      (item) => item.id === caseId,
    );
    if (listRecord) {
      listRecord.assignedUserId = input.assignedUserId;
      listRecord.assignedTo = details.assignedTo;
    }
    details.updatedAt = now;

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: caseId,
      action: 'STATUS_CHANGE',
      performedByUserId,
      beforeSnapshot,
      afterSnapshot: {
        status: details.status,
        cancellationProcess: details.cancellationProcess,
      },
      metadata: {
        cancellationProcessId: processId,
        resourceType: 'CANCELLATION_PROCESS',
        reason: input.reason,
        notes: input.notes ?? null,
      },
    });

    const response: CancellationProcessResponse = {
      id: processId,
      collectionCaseId: caseId,
      status: 'PENDING',
      reason: input.reason,
      notes: input.notes ?? null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
    };

    return Promise.resolve({
      outcome: 'success',
      cancellationProcess: response,
    });
  }

  revertCancellation({
    caseId,
    input,
    performedByUserId,
  }: RevertCancellationParams): Promise<RevertCancellationResult> {
    const details = mockCollectionCaseDetails[caseId];

    if (!details) {
      return Promise.resolve({ outcome: 'case_not_found' });
    }

    if (!canRevertCancellation(details.status)) {
      return Promise.resolve({
        outcome: 'status_not_allowed',
        currentStatus: details.status,
      });
    }

    const now = new Date().toISOString();
    const previousStatus = details.status;
    const previousAssignee = details.assignedTo;
    const assignedUserId = details.assignedTo?.id ?? performedByUserId;

    // Reverter devolve o caso para cobranca (nao credita recuperacao).
    details.status = 'IN_COLLECTION';

    if (
      details.cancellationProcess &&
      isReversibleCancellationProcess(details.cancellationProcess.status)
    ) {
      details.cancellationProcess = {
        ...details.cancellationProcess,
        status: 'CANCELLED',
        completedAt: now,
      };
    }

    if (!details.assignedTo && assignedUserId) {
      details.assignedTo = {
        id: assignedUserId,
        name: resolveMockActorName(assignedUserId) ?? assignedUserId,
      };
    }

    details.updatedAt = now;

    const record = mockCollectionCaseListRecords.find(
      (item) => item.id === caseId,
    );

    if (record) {
      record.status = 'IN_COLLECTION';
      record.assignedUserId = assignedUserId;
      record.assignedTo = details.assignedTo ?? null;
      record.updatedAt = now;
    }

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: caseId,
      action: 'STATUS_CHANGE',
      performedByUserId,
      beforeSnapshot: {
        status: previousStatus,
        assignedUserId: previousAssignee?.id ?? null,
      },
      afterSnapshot: {
        status: 'IN_COLLECTION',
        recoveredAt: null,
        assignedUserId,
      },
      metadata: {
        resourceType: 'COLLECTION_CASE',
        action: 'REVERT_CANCELLATION',
        reason: input.reason,
        notes: input.notes ?? null,
        outstandingAmount: details.outstandingAmount,
      },
    });

    return Promise.resolve({ outcome: 'success', case: details });
  }

  recoverCancelled({
    caseId,
    performedByUserId,
  }: RecoverCancelledParams): Promise<RecoverCancelledResult> {
    const details = mockCollectionCaseDetails[caseId];

    if (!details) {
      return Promise.resolve({ outcome: 'case_not_found' });
    }

    if (details.status !== 'CLOSED') {
      return Promise.resolve({
        outcome: 'status_not_allowed',
        currentStatus: details.status,
      });
    }

    const hasManualAttempt = details.attempts.some((a) => !a.isAutomatic);

    if (!hasManualAttempt) {
      return Promise.resolve({ outcome: 'no_manual_attempt' });
    }

    const now = new Date().toISOString();
    const previousStatus = details.status;
    details.status = 'RECOVERED';
    details.updatedAt = now;

    const record = mockCollectionCaseListRecords.find(
      (item) => item.id === caseId,
    );
    if (record) {
      record.status = 'RECOVERED';
      record.updatedAt = now;
    }

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: caseId,
      action: 'STATUS_CHANGE',
      performedByUserId,
      beforeSnapshot: { status: previousStatus },
      afterSnapshot: { status: 'RECOVERED', recoveredAt: now },
      metadata: {
        resourceType: 'COLLECTION_CASE',
        action: 'RECOVER_CANCELLED',
        description: 'Cliente cancelado recuperado',
      },
    });

    return Promise.resolve({ outcome: 'success', case: details });
  }

  assignCase({
    caseId,
    assignedUserId,
    performedByUserId,
  }: AssignCaseParams): Promise<AssignCaseResult> {
    const details = mockCollectionCaseDetails[caseId];

    if (!details) {
      return Promise.resolve({ outcome: 'case_not_found' });
    }

    const previousAssignee = details.assignedTo;
    const assigneeName = assignedUserId
      ? (resolveMockActorName(assignedUserId) ?? assignedUserId)
      : null;
    const now = new Date().toISOString();

    details.assignedTo = assignedUserId
      ? { id: assignedUserId, name: assigneeName ?? assignedUserId }
      : null;
    details.updatedAt = now;

    const record = mockCollectionCaseListRecords.find(
      (item) => item.id === caseId,
    );

    if (record) {
      record.assignedUserId = assignedUserId;
      record.assignedTo = details.assignedTo ?? null;
      record.updatedAt = now;
    }

    pushMockAuditLog({
      entityType: 'COLLECTION_CASE',
      entityId: caseId,
      action: 'UPDATE',
      performedByUserId,
      beforeSnapshot: {
        assignedUserId: previousAssignee?.id ?? null,
      },
      afterSnapshot: {
        assignedUserId,
      },
      metadata: {
        resourceType: 'COLLECTION_CASE',
        field: 'assignedUserId',
      },
    });

    return Promise.resolve({ outcome: 'success', case: details });
  }

  bulkAssignCases({
    caseIds,
    assignedUserId,
  }: BulkAssignCasesParams): Promise<BulkAssignCasesResult> {
    let assigned = 0;

    for (const caseId of caseIds) {
      const record = mockCollectionCaseListRecords.find((r) => r.id === caseId);

      if (!record) continue;

      record.assignedUserId = assignedUserId;
      assigned++;

      const details = mockCollectionCaseDetails[caseId];

      if (details) {
        details.assignedTo = assignedUserId
          ? { id: assignedUserId, name: assignedUserId }
          : null;
      }
    }

    return Promise.resolve({ assigned, skipped: caseIds.length - assigned });
  }

  autoDistributeCases(): Promise<AutoDistributeCasesResult> {
    return Promise.resolve({ distributed: 0, agents: 0 });
  }
}
