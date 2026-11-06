import { Injectable } from '@nestjs/common';
import { CollectionStatus, Prisma, PaymentPromiseStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma/prisma.service';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type {
  PaymentPromiseListItemResponse,
  PaymentPromisesSummaryResponse,
} from '@/modules/payment-promises/dto/payment-promise-list-item.response';
import type {
  ListPaymentPromisesParams,
  PaymentPromisesRepository,
} from '@/modules/payment-promises/repositories/payment-promises.repository';

// Pagou = caso retido (com contato) ou pagamento realizado (sem contato).
const PAID_CASE_STATUSES: CollectionStatus[] = [
  CollectionStatus.RECOVERED,
  CollectionStatus.PAYMENT_MADE,
];

const CASE_STATUSES_BY_SITUATION: Record<string, CollectionStatus[]> = {
  PAID: PAID_CASE_STATUSES,
  RECOVERED: [CollectionStatus.RECOVERED],
  PAYMENT_MADE: [CollectionStatus.PAYMENT_MADE],
  IN_COLLECTION: [
    CollectionStatus.WAITING_TRIAGE,
    CollectionStatus.IN_COLLECTION,
    CollectionStatus.NO_RESPONSE,
    CollectionStatus.AWAITING_PAYMENT,
  ],
  CANCELLATION: [
    CollectionStatus.ELIGIBLE_FOR_CANCELLATION,
    CollectionStatus.CANCELLATION_IN_PROGRESS,
    CollectionStatus.CANCELLED_IN_RECOVERY,
  ],
  CLOSED: [
    CollectionStatus.CLOSED,
    CollectionStatus.RENEGOTIATED,
    CollectionStatus.REACTIVATED,
  ],
};

@Injectable()
export class PaymentPromisesPrismaRepository implements PaymentPromisesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListPaymentPromisesParams) {
    const {
      status,
      from,
      to,
      assignedUserId,
      caseSituation,
      search,
      page,
      limit,
    } = params;
    const caseStatuses = caseSituation
      ? CASE_STATUSES_BY_SITUATION[caseSituation]
      : undefined;
    const skip = (page - 1) * limit;

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const where: Prisma.PaymentPromiseWhereInput = {
      ...(status && { status: status as PaymentPromiseStatus }),
      ...(fromDate || toDate
        ? {
            promisedDate: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
      collectionCase: {
        ...(assignedUserId && { assignedUserId }),
        ...(caseStatuses && { status: { in: caseStatuses } }),
        ...(search && {
          OR: [
            { customer: { name: { contains: search } } },
            { contract: { code: { contains: search } } },
            { customer: { document: { contains: search } } },
          ],
        }),
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.paymentPromise.findMany({
        where,
        include: {
          collectionCase: {
            include: {
              customer: { select: { id: true, name: true, document: true } },
              contract: { select: { id: true, code: true, status: true } },
              assignedUser: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { promisedDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentPromise.count({ where }),
    ]);

    const now = new Date();

    const mapped: PaymentPromiseListItemResponse[] = items.map((p) => ({
      id: p.id,
      collectionCaseId: p.collectionCaseId,
      status: p.status,
      promisedAmount: p.promisedAmount.toString(),
      promisedDate: p.promisedDate.toISOString(),
      notes: p.notes,
      fulfilledAt: p.fulfilledAt?.toISOString() ?? null,
      brokenAt: p.brokenAt?.toISOString() ?? null,
      cancelledAt: p.cancelledAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      isOverdue: p.status === 'ACTIVE' && p.promisedDate < now,
      caseStatus: p.collectionCase.status,
      caseRecoveredAt: p.collectionCase.recoveredAt?.toISOString() ?? null,
      customer: {
        id: p.collectionCase.customer.id,
        name: p.collectionCase.customer.name,
        document: p.collectionCase.customer.document,
      },
      contract: {
        id: p.collectionCase.contract.id,
        code: p.collectionCase.contract.code,
        status: p.collectionCase.contract.status,
      },
      assignedTo: p.collectionCase.assignedUser
        ? {
            id: p.collectionCase.assignedUser.id,
            name: p.collectionCase.assignedUser.name,
          }
        : null,
    }));

    return createPaginatedResponse(mapped, page, limit, total);
  }

  async getSummary(): Promise<PaymentPromisesSummaryResponse> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [active, overdue, overduePaid, fulfilledThisMonth, brokenThisMonth] =
      await Promise.all([
        this.prisma.paymentPromise.count({
          where: { status: PaymentPromiseStatus.ACTIVE },
        }),
        this.prisma.paymentPromise.count({
          where: {
            status: PaymentPromiseStatus.ACTIVE,
            promisedDate: { lt: now },
          },
        }),
        this.prisma.paymentPromise.count({
          where: {
            status: PaymentPromiseStatus.ACTIVE,
            promisedDate: { lt: now },
            collectionCase: { status: { in: PAID_CASE_STATUSES } },
          },
        }),
        this.prisma.paymentPromise.count({
          where: {
            status: PaymentPromiseStatus.FULFILLED,
            fulfilledAt: { gte: startOfMonth },
          },
        }),
        this.prisma.paymentPromise.count({
          where: {
            status: PaymentPromiseStatus.BROKEN,
            brokenAt: { gte: startOfMonth },
          },
        }),
      ]);

    return {
      active,
      overdue,
      overduePaid,
      fulfilledThisMonth,
      brokenThisMonth,
    };
  }
}
