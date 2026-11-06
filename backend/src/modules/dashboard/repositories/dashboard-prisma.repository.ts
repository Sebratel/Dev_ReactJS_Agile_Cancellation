import {
  CancellationStatus,
  CancellationStepStatus,
  CollectionStatus,
  InvoiceStatus,
  PaymentPromiseStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import {
  cancellationReasonCategoryLabel,
  categorizeCancellationReason,
  cleanCancellationReasonLabel,
  NO_CANCELLATION_REASON_LABEL,
  type CancellationReasonCategory,
} from '@/common/cancellation-reason';
import { formatDecimal } from '@/common/utils/decimal.util';
import {
  countContactedInCycleByAgent,
  PORTFOLIO_ACTIVE_STATUSES,
} from '@/modules/collection-cases/utils/portfolio-cases.util';
import { PrismaService } from '@/database/prisma/prisma.service';
import type { CancellationReasonsResponse } from '@/modules/dashboard/dto/cancellation-reasons.response';
import type { DashboardOperationsResponse } from '@/modules/dashboard/dto/dashboard-operations.response';
import type {
  DashboardOperationalAlert,
  DashboardRecoveryTrendItem,
  DashboardStatusDistributionItem,
  DashboardSummaryResponse,
} from '@/modules/dashboard/dto/dashboard-summary.response';
import type {
  DashboardRecoveryRankingItem,
  DashboardRecoveryRankingResponse,
} from '@/modules/dashboard/dto/dashboard-ranking.response';
import type {
  DashboardSummaryParams,
  DashboardRepository,
  RecoveryRankingParams,
} from '@/modules/dashboard/repositories/dashboard.repository';
import {
  calculateAverageCompletionDays,
  calculateFulfillmentRate,
  resolveMostBlockedStep,
} from '@/modules/dashboard/utils/dashboard-operations.utils';

const STATUS_LABELS: Record<CollectionStatus, string> = {
  WAITING_TRIAGE: 'Aguardando triagem',
  IN_COLLECTION: 'Em cobranca',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  NO_RESPONSE: 'Sem resposta',
  ELIGIBLE_FOR_CANCELLATION: 'Elegivel para cancelamento',
  CANCELLATION_IN_PROGRESS: 'Cancelamento em andamento',
  CLOSED: 'Encerrado',
  RECOVERED: 'Recuperado',
  PAYMENT_MADE: 'Pagamento realizado',
  RENEGOTIATED: 'Renegociado',
  CANCELLED_IN_RECOVERY: 'Cancelado em recuperacao',
  REACTIVATED: 'Reativado',
};

const ACTIVE_CANCELLATION_STATUSES: CancellationStatus[] = [
  CancellationStatus.PENDING,
  CancellationStatus.IN_PROGRESS,
  CancellationStatus.AWAITING_PROTOCOL,
  CancellationStatus.AWAITING_PICKUP,
];

const CANCELLED_ERP_STATUS = 'Cancelado';
const NO_REASON_LABEL = NO_CANCELLATION_REASON_LABEL;

@Injectable()
export class DashboardPrismaRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    params: DashboardSummaryParams = {},
  ): Promise<DashboardSummaryResponse> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const scopedCaseWhere: Prisma.CollectionCaseWhereInput =
      params.assignedUserId ? { assignedUserId: params.assignedUserId } : {};
    // Base unica dos numeros de carteira: so casos ATIVOS no escopo.
    const activeScopedCaseWhere: Prisma.CollectionCaseWhereInput = {
      ...scopedCaseWhere,
      status: { in: PORTFOLIO_ACTIVE_STATUSES },
    };
    const scopedPromiseWhere: Prisma.PaymentPromiseWhereInput =
      params.assignedUserId
        ? { collectionCase: { assignedUserId: params.assignedUserId } }
        : {};
    const scopedCancellationWhere: Prisma.CancellationProcessWhereInput =
      params.assignedUserId
        ? { collectionCase: { assignedUserId: params.assignedUserId } }
        : {};

    const [
      delinquentCustomers,
      openAmountAggregate,
      inCollection,
      eligibleForCancellation,
      recoveredMonthAggregate,
      recoveredAfterContactAggregate,
      activePromises,
      overduePromises,
      cancellationsInProgress,
      statusGroups,
      slaConfiguredCases,
      slaBreachedCases,
      awaitingProtocolCancellations,
      promisesDueToday,
      activeAgentsCount,
      agentsWithActivityToday,
      assignedActiveCases,
      contactedCases,
    ] = await Promise.all([
      // Clientes distintos com caso ATIVO e atraso (auditoria #6).
      this.countScopedDelinquentCustomers(activeScopedCaseWhere),
      // Valor em aberto = so carteira ativa (auditoria #1/#16/#24).
      this.prisma.collectionCase.aggregate({
        where: activeScopedCaseWhere,
        _sum: { outstandingAmount: true },
      }),
      this.prisma.collectionCase.count({
        where: {
          ...scopedCaseWhere,
          status: CollectionStatus.IN_COLLECTION,
        },
      }),
      this.prisma.collectionCase.count({
        where: {
          ...scopedCaseWhere,
          status: CollectionStatus.ELIGIBLE_FOR_CANCELLATION,
        },
      }),
      params.assignedUserId
        ? this.prisma.collectionCase.aggregate({
            where: {
              ...scopedCaseWhere,
              status: CollectionStatus.RECOVERED,
              recoveredAt: { gte: monthStart, lt: monthEnd },
            },
            _sum: { recoveredAmount: true },
          })
        : this.prisma.invoice.aggregate({
            where: {
              status: InvoiceStatus.PAID,
              updatedAt: { gte: monthStart, lt: monthEnd },
            },
            _sum: { paidAmount: true },
          }),
      // So o que foi recuperado com contato de atendente antes do pagamento.
      this.prisma.collectionCase.aggregate({
        where: {
          ...scopedCaseWhere,
          status: CollectionStatus.RECOVERED,
          recoveredAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { recoveredAmount: true },
      }),
      this.prisma.paymentPromise.count({
        where: { ...scopedPromiseWhere, status: PaymentPromiseStatus.ACTIVE },
      }),
      this.prisma.paymentPromise.count({
        where: {
          ...scopedPromiseWhere,
          OR: [
            {
              status: PaymentPromiseStatus.ACTIVE,
              promisedDate: { lt: now },
            },
            {
              status: {
                in: [PaymentPromiseStatus.BROKEN, PaymentPromiseStatus.EXPIRED],
              },
            },
          ],
        },
      }),
      this.prisma.cancellationProcess.count({
        where: {
          ...scopedCancellationWhere,
          status: { in: ACTIVE_CANCELLATION_STATUSES },
        },
      }),
      this.prisma.collectionCase.groupBy({
        by: ['status'],
        where: scopedCaseWhere,
        _count: { _all: true },
      }),
      // Casos ativos com SLA definido (hoje nenhum codigo grava slaDueAt).
      this.prisma.collectionCase.count({
        where: { ...activeScopedCaseWhere, slaDueAt: { not: null } },
      }),
      this.prisma.collectionCase.count({
        where: {
          ...scopedCaseWhere,
          slaDueAt: { lt: now },
          status: { in: PORTFOLIO_ACTIVE_STATUSES },
        },
      }),
      this.prisma.cancellationProcess.count({
        where: {
          ...scopedCancellationWhere,
          status: CancellationStatus.AWAITING_PROTOCOL,
        },
      }),
      this.prisma.paymentPromise.count({
        where: {
          ...scopedPromiseWhere,
          status: PaymentPromiseStatus.ACTIVE,
          promisedDate: { gte: todayStart, lt: todayEnd },
        },
      }),
      params.assignedUserId
        ? Promise.resolve(0)
        : this.prisma.user.count({
            where: {
              status: UserStatus.ACTIVE,
              userRoles: {
                some: {
                  role: {
                    code: { in: ['COLLECTION_AGENT', 'CANCELLATION_AGENT'] },
                  },
                },
              },
            },
          }),
      params.assignedUserId
        ? Promise.resolve([])
        : this.prisma.collectionAttempt.groupBy({
            by: ['performedByUserId'],
            where: {
              performedByUserId: { not: null },
              attemptedAt: { gte: todayStart, lt: todayEnd },
            },
          }),
      // Anel "contatados/carteira": mesma regra de getPortfolios — so casos
      // ativos (PORTFOLIO_ACTIVE_STATUSES) e contato manual no ciclo atual.
      this.prisma.collectionCase.count({
        where: {
          ...scopedCaseWhere,
          status: { in: PORTFOLIO_ACTIVE_STATUSES },
        },
      }),
      countContactedInCycleByAgent(this.prisma, params.assignedUserId).then(
        (byAgent) =>
          Array.from(byAgent.values()).reduce((sum, total) => sum + total, 0),
      ),
    ]);

    const inactiveAgents = Math.max(
      activeAgentsCount - agentsWithActivityToday.length,
      0,
    );

    const statusDistribution: DashboardStatusDistributionItem[] =
      statusGroups.map((group) => ({
        status: group.status,
        label: STATUS_LABELS[group.status],
        count: group._count._all,
        group: PORTFOLIO_ACTIVE_STATUSES.includes(group.status)
          ? ('portfolio' as const)
          : ('history' as const),
      }));

    // Sem contato manual no ciclo atual — mesma definicao do anel da carteira.
    const casesWithoutAttempts = Math.max(
      Number(assignedActiveCases) - Number(contactedCases),
      0,
    );
    const slaConfigured = Number(slaConfiguredCases) > 0;

    const recoveryTrend = await this.buildRecoveryTrend(now, scopedCaseWhere);

    const recoveredMonthSum = recoveredMonthAggregate._sum as {
      recoveredAmount?: Prisma.Decimal | null;
      paidAmount?: Prisma.Decimal | null;
    };

    const operationalAlerts: DashboardOperationalAlert[] = [
      {
        key: 'overduePromises',
        title: 'Promessas vencidas',
        description:
          'Clientes com promessa descumprida aguardando reabordagem.',
        count: overduePromises,
      },
      {
        key: 'noContactAttempt',
        title: 'Casos sem contato manual',
        description:
          'Casos ativos sem contato manual de atendente no ciclo atual.',
        count: casesWithoutAttempts,
      },
      {
        key: 'slaBreached',
        title: 'Casos com SLA vencido',
        description:
          'Ocorrencias fora do prazo operacional definido pela supervisao.',
        count: slaConfigured ? slaBreachedCases : 0,
        ...(slaConfigured ? {} : { notice: 'SLA não configurado' }),
      },
      {
        key: 'awaitingProtocol',
        title: 'Cancelamentos aguardando protocolo',
        description:
          'Processos sem protocolo de retirada devidamente registrado.',
        count: awaitingProtocolCancellations,
      },
      {
        key: 'promisesDueToday',
        title: 'Promessas vencendo hoje',
        description:
          'Acordos de pagamento com vencimento previsto para o dia de hoje.',
        count: promisesDueToday,
      },
      {
        key: 'inactiveAgents',
        title: 'Agentes sem atividade hoje',
        description:
          'Agentes ativos sem nenhuma tentativa de contato registrada hoje.',
        count: inactiveAgents,
      },
    ].filter(
      (alert) => !(params.assignedUserId && alert.key === 'inactiveAgents'),
    );

    return {
      metrics: {
        delinquentCustomers,
        openAmount: formatDecimal(openAmountAggregate._sum.outstandingAmount),
        inCollection,
        eligibleForCancellation,
        recoveredMonth: formatDecimal(
          recoveredMonthSum.paidAmount ?? recoveredMonthSum.recoveredAmount,
        ),
        recoveredAfterContactMonth: formatDecimal(
          recoveredAfterContactAggregate._sum.recoveredAmount,
        ),
        activePromises,
        overduePromises,
        cancellationsInProgress,
        assignedActiveCases,
        contactedCases,
      },
      statusDistribution,
      recoveryTrend,
      operationalAlerts,
    };
  }

  async getOperations(): Promise<DashboardOperationsResponse> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [
      activeCases,
      newCasesToday,
      contactedByAgent,
      slaConfiguredCases,
      overdueSlaCases,
      activePromises,
      fulfilledPromises,
      brokenPromises,
      cancellationsInProgress,
      cancellationsCompleted,
      outstandingAmountAggregate,
      promisedAmountAggregate,
      recoveredAmountAggregate,
      cancelledAmountAggregate,
      pendingStepGroups,
      completedProcesses,
    ] = await Promise.all([
      this.prisma.collectionCase.count({
        where: { status: { in: PORTFOLIO_ACTIVE_STATUSES } },
      }),
      this.prisma.collectionCase.count({
        where: {
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      // Contatados no ciclo atual (mesma definicao da carteira).
      countContactedInCycleByAgent(this.prisma),
      this.prisma.collectionCase.count({
        where: {
          status: { in: PORTFOLIO_ACTIVE_STATUSES },
          slaDueAt: { not: null },
        },
      }),
      this.prisma.collectionCase.count({
        where: {
          slaDueAt: { lt: now },
          status: { in: PORTFOLIO_ACTIVE_STATUSES },
        },
      }),
      this.prisma.paymentPromise.count({
        where: { status: PaymentPromiseStatus.ACTIVE },
      }),
      this.prisma.paymentPromise.count({
        where: { status: PaymentPromiseStatus.FULFILLED },
      }),
      this.prisma.paymentPromise.count({
        where: { status: PaymentPromiseStatus.BROKEN },
      }),
      this.prisma.cancellationProcess.count({
        where: { status: CancellationStatus.IN_PROGRESS },
      }),
      this.prisma.cancellationProcess.count({
        where: { status: CancellationStatus.COMPLETED },
      }),
      // Valor em aberto = so carteira ativa.
      this.prisma.collectionCase.aggregate({
        where: { status: { in: PORTFOLIO_ACTIVE_STATUSES } },
        _sum: { outstandingAmount: true },
      }),
      this.prisma.paymentPromise.aggregate({
        where: { status: PaymentPromiseStatus.ACTIVE },
        _sum: { promisedAmount: true },
      }),
      this.prisma.paymentPromise.aggregate({
        where: { status: PaymentPromiseStatus.FULFILLED },
        _sum: { promisedAmount: true },
      }),
      this.prisma.collectionCase.aggregate({
        where: {
          status: CollectionStatus.CLOSED,
          cancellationProcesses: {
            some: { status: CancellationStatus.COMPLETED },
          },
        },
        _sum: { outstandingAmount: true },
      }),
      this.prisma.cancellationStep.groupBy({
        by: ['name'],
        where: { status: CancellationStepStatus.PENDING },
        _count: { _all: true },
        orderBy: { _count: { name: 'desc' } },
        take: 1,
      }),
      this.prisma.cancellationProcess.findMany({
        where: {
          status: CancellationStatus.COMPLETED,
          completedAt: { not: null },
        },
        select: {
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    const contactedActive = Array.from(contactedByAgent.values()).reduce(
      (sum, total) => sum + total,
      0,
    );

    return {
      collection: {
        activeCases,
        newCasesToday,
        casesWithoutInteraction: Math.max(activeCases - contactedActive, 0),
        slaConfigured: slaConfiguredCases > 0,
        overdueSlaCases: slaConfiguredCases > 0 ? overdueSlaCases : 0,
      },
      promises: {
        activePromises,
        fulfilledPromises,
        brokenPromises,
        fulfillmentRate: calculateFulfillmentRate(
          fulfilledPromises,
          brokenPromises,
        ),
      },
      cancellations: {
        inProgress: cancellationsInProgress,
        completed: cancellationsCompleted,
        averageCompletionDays:
          calculateAverageCompletionDays(completedProcesses),
        mostBlockedStep: resolveMostBlockedStep(pendingStepGroups),
      },
      financial: {
        outstandingAmount: formatDecimal(
          outstandingAmountAggregate._sum.outstandingAmount,
        ),
        promisedAmount: formatDecimal(
          promisedAmountAggregate._sum.promisedAmount,
        ),
        recoveredAmount: formatDecimal(
          recoveredAmountAggregate._sum.promisedAmount,
        ),
        cancelledAmount: formatDecimal(
          cancelledAmountAggregate._sum.outstandingAmount,
        ),
      },
    };
  }

  async getRecoveryRanking({
    from,
    to,
  }: RecoveryRankingParams): Promise<DashboardRecoveryRankingResponse> {
    const grouped = await this.prisma.collectionCase.groupBy({
      by: ['assignedUserId'],
      where: {
        status: CollectionStatus.RECOVERED,
        recoveredAt: { gte: from, lt: to },
        assignedUserId: { not: null },
      },
      _sum: { recoveredAmount: true },
      _count: { _all: true },
    });

    const userIds = grouped
      .map((group) => group.assignedUserId)
      .filter((id): id is string => id !== null);

    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, avatarUrl: true },
          })
        : [];

    const nameById = new Map(users.map((user) => [user.id, user.name]));
    const avatarById = new Map(users.map((user) => [user.id, user.avatarUrl]));

    const ranking: DashboardRecoveryRankingItem[] = grouped
      .map((group) => ({
        userId: group.assignedUserId as string,
        name: nameById.get(group.assignedUserId as string) ?? 'Sem nome',
        avatarUrl: avatarById.get(group.assignedUserId as string) ?? null,
        recoveredAmountValue: Number(
          group._sum.recoveredAmount?.toString() ?? '0',
        ),
        recoveredCases: group._count._all,
      }))
      .sort((a, b) => b.recoveredAmountValue - a.recoveredAmountValue)
      .map((item, index) => ({
        rank: index + 1,
        userId: item.userId,
        name: item.name,
        avatarUrl: item.avatarUrl,
        recoveredAmount: item.recoveredAmountValue.toFixed(2),
        recoveredCases: item.recoveredCases,
      }));

    const totalRecoveredAmount = ranking.reduce(
      (total, item) => total + Number(item.recoveredAmount),
      0,
    );
    const totalRecoveredCases = ranking.reduce(
      (total, item) => total + item.recoveredCases,
      0,
    );

    return {
      periodFrom: from.toISOString(),
      periodTo: to.toISOString(),
      totalRecoveredAmount: totalRecoveredAmount.toFixed(2),
      totalRecoveredCases,
      ranking,
    };
  }

  // Recuperação dos últimos 7 dias (terminando hoje), por dia de recuperação.
  private async buildRecoveryTrend(
    now: Date,
    caseWhere: Prisma.CollectionCaseWhereInput = {},
  ): Promise<DashboardRecoveryTrendItem[]> {
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const windowStart = new Date(todayStart);
    windowStart.setDate(windowStart.getDate() - 6);
    const windowEnd = new Date(todayStart);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const recoveredCases = await this.prisma.collectionCase.findMany({
      where: {
        ...caseWhere,
        status: CollectionStatus.RECOVERED,
        recoveredAt: { gte: windowStart, lt: windowEnd },
      },
      select: {
        recoveredAt: true,
        recoveredAmount: true,
      },
    });

    const trend: DashboardRecoveryTrendItem[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dayStart = new Date(windowStart);
      dayStart.setDate(windowStart.getDate() + dayIndex);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayCases = recoveredCases.filter(
        (item) =>
          item.recoveredAt !== null &&
          item.recoveredAt >= dayStart &&
          item.recoveredAt < dayEnd,
      );

      const recoveredAmount = dayCases.reduce(
        (total, item) =>
          total + Number(item.recoveredAmount?.toString() ?? '0'),
        0,
      );

      trend.push({
        dayLabel: `${String(dayStart.getDate()).padStart(2, '0')}/${String(dayStart.getMonth() + 1).padStart(2, '0')}`,
        recoveredAmount: recoveredAmount.toFixed(2),
        recoveredCases: dayCases.length,
      });
    }

    return trend;
  }

  private async countScopedDelinquentCustomers(
    caseWhere: Prisma.CollectionCaseWhereInput,
  ) {
    const customers = await this.prisma.collectionCase.findMany({
      where: {
        ...caseWhere,
        daysOverdue: { gt: 0 },
      },
      distinct: ['customerId'],
      select: { customerId: true },
    });

    return customers.length;
  }

  // Relatório de encerrados por motivo (categorizado). Considera só CLOSED cujo
  // contrato está Cancelado no ERP (erpStatus); quem fechou sem motivo capturado
  // aparece como "Sem motivo registrado" e continua no total.
  async getCancellationReasons(): Promise<CancellationReasonsResponse> {
    const [closedCases, excludedNotCancelled] = await Promise.all([
      this.prisma.collectionCase.findMany({
        where: {
          status: CollectionStatus.CLOSED,
          contract: { erpStatus: CANCELLED_ERP_STATUS },
        },
        select: { contract: { select: { cancellationReason: true } } },
      }),
      this.prisma.collectionCase.count({
        where: {
          status: CollectionStatus.CLOSED,
          NOT: { contract: { erpStatus: CANCELLED_ERP_STATUS } },
        },
      }),
    ]);

    const totalClosed = closedCases.length;
    const categoryCount = new Map<CancellationReasonCategory, number>();
    const reasonCount = new Map<
      string,
      { reason: string; category: CancellationReasonCategory; count: number }
    >();
    let withReason = 0;

    for (const item of closedCases) {
      const raw = item.contract?.cancellationReason ?? null;
      if (raw) {
        withReason += 1;
      }
      const category = categorizeCancellationReason(raw);
      categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1);

      const reason = cleanCancellationReasonLabel(raw) ?? NO_REASON_LABEL;
      const key = `${category}::${reason}`;
      const existing = reasonCount.get(key);
      reasonCount.set(key, {
        reason,
        category,
        count: (existing?.count ?? 0) + 1,
      });
    }

    const categories: CancellationReasonCategory[] = [
      'INADIMPLENCIA',
      'EXTERNO',
      'OUTRO',
    ];
    const byCategory = categories.map((category) => {
      const count = categoryCount.get(category) ?? 0;
      return {
        category,
        label: cancellationReasonCategoryLabel(category),
        count,
        percentage:
          totalClosed > 0 ? Math.round((count / totalClosed) * 1000) / 10 : 0,
      };
    });

    const allReasons = [...reasonCount.values()].sort(
      (a, b) => b.count - a.count,
    );
    const topReasons = allReasons.slice(0, 12);

    return {
      totalClosed,
      withReason,
      byCategory,
      topReasons,
      allReasons,
      excludedNotCancelled,
    };
  }
}
