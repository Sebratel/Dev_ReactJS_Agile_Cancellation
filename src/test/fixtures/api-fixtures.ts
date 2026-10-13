import { type CollectionCaseDetailsResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import { type CollectionCaseListItemResponse } from '@/features/collection-cases/types/collection-cases-api.types';
import {
  type DashboardOperationsResponse,
  type DashboardSummaryResponse,
} from '@/features/dashboard/types/dashboard-api.types';
import { type PaginatedResponse } from '@/services/api/types/api-envelope';

export const mockDashboardSummaryResponse: DashboardSummaryResponse = {
  metrics: {
    delinquentCustomers: 128,
    openAmount: '184750.42',
    inCollection: 76,
    eligibleForCancellation: 21,
    recoveredMonth: '48320.90',
    activePromises: 34,
    overduePromises: 9,
    cancellationsInProgress: 15,
    assignedActiveCases: 54,
    contactedCases: 31,
  },
  statusDistribution: [
    {
      status: 'WAITING_TRIAGE',
      label: 'Aguardando triagem',
      count: 18,
      group: 'portfolio',
    },
    {
      status: 'IN_COLLECTION',
      label: 'Em cobrança',
      count: 76,
      group: 'portfolio',
    },
    {
      status: 'AWAITING_PAYMENT',
      label: 'Aguardando pagamento',
      count: 34,
      group: 'portfolio',
    },
    {
      status: 'NO_RESPONSE',
      label: 'Sem resposta',
      count: 22,
      group: 'portfolio',
    },
    {
      status: 'ELIGIBLE_FOR_CANCELLATION',
      label: 'Elegível para cancelamento',
      count: 21,
      group: 'portfolio',
    },
    {
      status: 'CANCELLATION_IN_PROGRESS',
      label: 'Cancelamento em andamento',
      count: 15,
      group: 'portfolio',
    },
  ],
  recoveryTrend: [
    { dayLabel: 'Dia 1', recoveredAmount: '4320.50', recoveredCases: 3 },
    { dayLabel: 'Dia 2', recoveredAmount: '6180.20', recoveredCases: 5 },
    { dayLabel: 'Dia 3', recoveredAmount: '5820.90', recoveredCases: 4 },
    { dayLabel: 'Dia 4', recoveredAmount: '7490.30', recoveredCases: 6 },
    { dayLabel: 'Dia 5', recoveredAmount: '6925.40', recoveredCases: 5 },
    { dayLabel: 'Dia 6', recoveredAmount: '8230.80', recoveredCases: 7 },
    { dayLabel: 'Dia 7', recoveredAmount: '9352.80', recoveredCases: 8 },
  ],
  operationalAlerts: [
    {
      key: 'overduePromises',
      title: 'Promessas vencidas',
      description: 'Clientes com promessa descumprida aguardando reabordagem.',
      count: 9,
      group: 'portfolio',
    },
    {
      key: 'noContactAttempt',
      title: 'Casos sem tentativa de contato',
      description:
        'Itens sem primeira ação registrada dentro da janela esperada.',
      count: 12,
      group: 'portfolio',
    },
    {
      key: 'slaBreached',
      title: 'Casos com SLA vencido',
      description:
        'Ocorrências fora do prazo operacional definido pela supervisão.',
      count: 7,
      group: 'portfolio',
    },
    {
      key: 'awaitingProtocol',
      title: 'Cancelamentos aguardando protocolo',
      description:
        'Processos sem protocolo de retirada devidamente registrado.',
      count: 5,
      group: 'portfolio',
    },
  ],
};

export const mockDashboardOperationsResponse: DashboardOperationsResponse = {
  collection: {
    activeCases: 186,
    newCasesToday: 4,
    casesWithoutInteraction: 12,
    overdueSlaCases: 7,
    slaConfigured: true,
  },
  promises: {
    activePromises: 34,
    fulfilledPromises: 58,
    brokenPromises: 14,
    fulfillmentRate: 58 / (58 + 14),
  },
  cancellations: {
    inProgress: 6,
    completed: 11,
    averageCompletionDays: 5.2,
    mostBlockedStep: {
      stepCode: 'OPEN_ELEVEN_REQUEST',
      count: 9,
      group: 'portfolio',
    },
  },
  financial: {
    outstandingAmount: '184750.42',
    promisedAmount: '42350.00',
    recoveredAmount: '91280.50',
    cancelledAmount: '31840.75',
  },
};

export const mockCollectionCaseListItems: CollectionCaseListItemResponse[] = [
  {
    id: 'case_0001',
    customerName: 'Construtora Horizonte',
    customerPhone: '(51) 99911-2233',
    contractCode: 'CTR-10428',
    contractStatus: 'ACTIVE',
    contractErpStatus: 'Normal',
    contractCancellationReason: null,
    contractCancellationReasonCategory: null,
    firstOverdueDate: new Date(Date.now() - 119 * 86_400_000).toISOString(),
    secondOverdueDate: new Date(Date.now() - 89 * 86_400_000).toISOString(),
    status: 'NO_RESPONSE',
    priority: 'HIGH',
    daysOverdue: 119,
    outstandingAmount: '12890.55',
    totalAttempts: 4,
    assignedTo: { id: 'usr_marina', name: 'Marina Lopes' },
    slaDueAt: new Date(Date.now() - 172_800_000).toISOString(),
    matrixAwaitingReply: false,
    matrixLastOutboundAt: null,
    matrixLastReplyAt: null,
  },
  {
    id: 'case_0002',
    customerName: 'Mercado Litoral',
    customerPhone: '(51) 99944-5566',
    contractCode: 'CTR-10311',
    contractStatus: 'SUSPENDED',
    contractErpStatus: 'Bloqueio Financeiro',
    contractCancellationReason: null,
    contractCancellationReasonCategory: null,
    firstOverdueDate: new Date(Date.now() - 133 * 86_400_000).toISOString(),
    secondOverdueDate: new Date(Date.now() - 103 * 86_400_000).toISOString(),
    status: 'ELIGIBLE_FOR_CANCELLATION',
    priority: 'HIGH',
    daysOverdue: 133,
    outstandingAmount: '9430.90',
    totalAttempts: 2,
    assignedTo: { id: 'usr_carlos', name: 'Carlos Nunes' },
    slaDueAt: new Date(Date.now() + 14_400_000).toISOString(),
    matrixAwaitingReply: false,
    matrixLastOutboundAt: null,
    matrixLastReplyAt: null,
  },
];

export function createMockCollectionCasesPage(
  page: number,
  limit: number,
  total = 42,
): PaginatedResponse<CollectionCaseListItemResponse> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;

  return {
    items: Array.from(
      { length: Math.min(limit, total - startIndex) },
      (_, index) => {
        const itemIndex = startIndex + index;
        const template =
          mockCollectionCaseListItems[
            itemIndex % mockCollectionCaseListItems.length
          ];

        if (!template) {
          throw new Error('Mock collection case list item not found.');
        }

        return {
          ...template,
          id: `case_${String(itemIndex + 1).padStart(4, '0')}`,
          contractCode: `CTR-${10428 + itemIndex}`,
        };
      },
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export const mockCollectionCaseDetails: CollectionCaseDetailsResponse = {
  id: 'case_0001',
  customer: {
    id: 'cus_horizonte',
    name: 'Construtora Horizonte',
    document: '12.345.678/0001-90',
    phone: '(51) 99911-2233',
  },
  contract: {
    id: 'ctr_10428',
    code: 'CTR-10428',
    status: 'ACTIVE',
    erpStatus: 'Normal',
    cancellationReason: null,
    cancellationReasonCategory: null,
    cancellationReasonCategoryLabel: null,
  },
  status: 'NO_RESPONSE',
  priority: 'HIGH',
  daysOverdue: 119,
  outstandingAmount: '12890.55',
  totalOutstanding: '12890.55',
  assignedTo: {
    id: 'usr_marina',
    name: 'Marina Lopes',
  },
  slaDueAt: new Date(Date.now() - 172_800_000).toISOString(),
  recentAttempts: [
    {
      id: 'att_0001_auto',
      channel: 'WHATSAPP',
      result: 'NO_ANSWER',
      attemptedAt: new Date(Date.now() - 2_592_000_000).toISOString(),
      isAutomatic: true,
    },
    {
      id: 'att_0001',
      channel: 'PHONE',
      result: 'NO_ANSWER',
      attemptedAt: new Date(Date.now() - 604_800_000).toISOString(),
      isAutomatic: false,
    },
  ],
  attempts: [
    {
      id: 'att_0001_auto',
      channel: 'WHATSAPP',
      result: 'NO_ANSWER',
      attemptedAt: new Date(Date.now() - 2_592_000_000).toISOString(),
      isAutomatic: true,
    },
    {
      id: 'att_0001',
      channel: 'PHONE',
      result: 'NO_ANSWER',
      attemptedAt: new Date(Date.now() - 604_800_000).toISOString(),
      isAutomatic: false,
    },
    {
      id: 'att_0002',
      channel: 'WHATSAPP',
      result: 'CONTACTED',
      attemptedAt: new Date(Date.now() - 432_000_000).toISOString(),
      nextContactAt: new Date(Date.now() + 172_800_000).toISOString(),
      isAutomatic: false,
    },
  ],
  activePromise: null,
  promises: [
    {
      id: 'prm_0001',
      status: 'ACTIVE',
      promisedAmount: '2500.00',
      promisedDate: new Date(Date.now() + 604_800_000).toISOString(),
      notes: 'Pagamento parcelado acordado.',
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    },
  ],
  invoices: [
    {
      id: 'inv_0001',
      invoiceNumber: 'NF-2026-001',
      status: 'OVERDUE',
      dueDate: new Date(Date.now() - 120 * 86_400_000).toISOString(),
      amount: '12890.55',
      paidAmount: '0.00',
    },
  ],
  matrixContact: {
    attendanceCode: null,
    messageCode: null,
    awaitingReply: false,
    lastOutboundAt: null,
    lastReplyAt: null,
  },
  cancellationProcess: null,
  createdAt: new Date(Date.now() - 2_592_000_000).toISOString(),
  updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
};

export function createMockAuditLogsPage(
  page: number,
  limit: number,
  total = 2,
) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const allItems = [
    {
      id: 'audit_1',
      actor: {
        id: 'user-admin',
        name: 'Ana Martins',
        email: 'admin@ger.local',
      },
      entityType: 'COLLECTION_CASE',
      entityId: 'case_0001',
      action: 'CREATE',
      summary: 'Tentativa de cobrança registrada',
      createdAt: new Date().toISOString(),
      metadata: { attemptId: 'att_1' },
    },
    {
      id: 'audit_2',
      actor: {
        id: 'user-supervisor',
        name: 'Paulo Nogueira',
        email: 'supervisor@ger.local',
      },
      entityType: 'COLLECTION_CASE',
      entityId: 'case_0002',
      action: 'STATUS_CHANGE',
      summary: 'Caso encaminhado para cancelamento',
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
      metadata: {
        resourceType: 'CANCELLATION_PROCESS',
        reason: 'Inadimplência',
      },
    },
  ];

  const startIndex = (page - 1) * limit;

  return {
    items:
      total === 0
        ? []
        : allItems.slice(startIndex, startIndex + limit).slice(0, total),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
