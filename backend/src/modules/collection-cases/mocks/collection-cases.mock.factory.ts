import type { CollectionCaseDetailsResponse } from '@/modules/collection-cases/dto/collection-case-details.response';
import type { CollectionCaseListItemResponse } from '@/modules/collection-cases/dto/collection-case-list-item.response';
import { buildMockDetailExtensions } from '@/modules/collection-cases/mocks/collection-case-details.helpers';
import type { MockCollectionCaseListRecord } from '@/modules/collection-cases/utils/collection-cases-list.utils';

const ASSIGNEES = [
  { id: 'usr_marina', name: 'Marina Lopes' },
  { id: 'usr_carlos', name: 'Carlos Nunes' },
  { id: 'usr_rafaela', name: 'Rafaela Costa' },
  { id: 'usr_paulo', name: 'Paulo Nogueira' },
] as const;

const CUSTOMERS = [
  {
    id: 'cus_horizonte',
    name: 'Construtora Horizonte',
    document: '12.345.678/0001-90',
    phone: '(51) 99911-2233',
  },
  {
    id: 'cus_litoral',
    name: 'Mercado Litoral',
    document: '98.765.432/0001-10',
    phone: '(51) 99944-5566',
  },
  {
    id: 'cus_gabriel',
    name: 'Clinica Sao Gabriel',
    document: '11.222.333/0001-44',
    phone: '(51) 99977-8899',
  },
  {
    id: 'cus_vale',
    name: 'Industria Vale Norte',
    document: '55.666.777/0001-88',
    phone: null,
  },
] as const;

const STATUSES = [
  'NO_RESPONSE',
  'ELIGIBLE_FOR_CANCELLATION',
  'AWAITING_PAYMENT',
  'CANCELLATION_IN_PROGRESS',
  'IN_COLLECTION',
  'WAITING_TRIAGE',
] as const;

const PRIORITIES = ['HIGH', 'HIGH', 'MEDIUM', 'HIGH', 'MEDIUM', 'LOW'] as const;

function buildListRecord(index: number): MockCollectionCaseListRecord {
  const customer = CUSTOMERS[index % CUSTOMERS.length]!;
  const assignee =
    index % 5 === 0 ? null : ASSIGNEES[index % ASSIGNEES.length]!;
  const contractNumber = 10428 + index;
  const createdAt = new Date(
    Date.now() - (42 - index) * 86_400_000,
  ).toISOString();
  const updatedAt = new Date(Date.now() - index * 3_600_000).toISOString();
  const firstOverdueDate = new Date(
    Date.now() - (90 + (index % 60)) * 86_400_000,
  ).toISOString();
  const paymentPromiseStatuses: Array<
    'ACTIVE' | 'FULFILLED' | 'BROKEN' | 'CANCELLED' | 'EXPIRED'
  > = [];

  if (index % 4 === 0) {
    paymentPromiseStatuses.push('ACTIVE');
  }

  if (index % 6 === 0) {
    paymentPromiseStatuses.push('BROKEN');
  }

  if (index % 8 === 0) {
    paymentPromiseStatuses.push('FULFILLED');
  }

  return {
    id: `case_${String(index + 1).padStart(4, '0')}`,
    customerName: customer.name,
    customerPhone: customer.phone,
    contractCode: `CTR-${contractNumber}`,
    contractStatus: index % 7 === 0 ? 'SUSPENDED' : 'ACTIVE',
    firstOverdueDate,
    status: STATUSES[index % STATUSES.length]!,
    priority: PRIORITIES[index % PRIORITIES.length]!,
    daysOverdue: 90 + (index % 60),
    outstandingAmount: (8500 + index * 137.55).toFixed(2),
    assignedTo: assignee ? { id: assignee.id, name: assignee.name } : null,
    matrixAwaitingReply: false,
    matrixLastOutboundAt: null,
    matrixLastReplyAt: null,
    assignedUserId: assignee?.id ?? null,
    customerDocument: customer.document,
    contractExternalId: `EXT-${contractNumber}`,
    slaDueAt:
      index % 4 === 0
        ? null
        : index % 3 === 0
          ? new Date(Date.now() - 86_400_000).toISOString()
          : new Date(Date.now() + 86_400_000 * (index % 5)).toISOString(),
    createdAt,
    updatedAt,
    hasCollectionAttempts: index % 5 !== 0,
    paymentPromiseStatuses,
  };
}

export function createMockCollectionCaseListRecords(): MockCollectionCaseListRecord[] {
  return Array.from({ length: 42 }, (_, index) => buildListRecord(index));
}

export function createMockCollectionCaseListItems(
  listRecords: MockCollectionCaseListRecord[],
): CollectionCaseListItemResponse[] {
  return listRecords.map((record) => ({
    id: record.id,
    customerName: record.customerName,
    customerPhone: record.customerPhone,
    contractCode: record.contractCode,
    contractStatus: record.contractStatus,
    firstOverdueDate: record.firstOverdueDate,
    status: record.status,
    priority: record.priority,
    daysOverdue: record.daysOverdue,
    outstandingAmount: record.outstandingAmount,
    assignedTo: record.assignedTo,
    slaDueAt: record.slaDueAt,
    matrixAwaitingReply: record.matrixAwaitingReply,
    matrixLastOutboundAt: record.matrixLastOutboundAt,
    matrixLastReplyAt: record.matrixLastReplyAt,
  }));
}

function emptyMatrixContact() {
  return {
    attendanceCode: null,
    messageCode: null,
    awaitingReply: false,
    lastOutboundAt: null,
    lastReplyAt: null,
  };
}

export function createMockCollectionCaseDetails(): Record<
  string,
  CollectionCaseDetailsResponse
> {
  return {
    case_0001: {
      id: 'case_0001',
      customer: CUSTOMERS[0],
      contract: {
        id: 'ctr_10428',
        code: 'CTR-10428',
        status: 'ACTIVE',
      },
      status: 'NO_RESPONSE',
      priority: 'HIGH',
      daysOverdue: 119,
      outstandingAmount: '12890.55',
      assignedTo: ASSIGNEES[0],
      slaDueAt: new Date(Date.now() - 172_800_000).toISOString(),
      recentAttempts: [
        {
          id: 'att_0001',
          channel: 'PHONE',
          result: 'NO_ANSWER',
          attemptedAt: new Date(Date.now() - 604_800_000).toISOString(),
        },
        {
          id: 'att_0002',
          channel: 'WHATSAPP',
          result: 'CONTACTED',
          attemptedAt: new Date(Date.now() - 432_000_000).toISOString(),
        },
        {
          id: 'att_0003',
          channel: 'EMAIL',
          result: 'NO_ANSWER',
          attemptedAt: new Date(Date.now() - 259_200_000).toISOString(),
        },
      ],
      activePromise: null,
      matrixContact: emptyMatrixContact(),
      ...buildMockDetailExtensions(
        '12890.55',
        [
          {
            id: 'att_0001',
            channel: 'PHONE',
            result: 'NO_ANSWER',
            attemptedAt: new Date(Date.now() - 604_800_000).toISOString(),
          },
          {
            id: 'att_0002',
            channel: 'WHATSAPP',
            result: 'CONTACTED',
            attemptedAt: new Date(Date.now() - 432_000_000).toISOString(),
          },
          {
            id: 'att_0003',
            channel: 'EMAIL',
            result: 'NO_ANSWER',
            attemptedAt: new Date(Date.now() - 259_200_000).toISOString(),
          },
        ],
        null,
      ),
      createdAt: new Date(Date.now() - 2_592_000_000).toISOString(),
      updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
    },
    case_0002: {
      id: 'case_0002',
      customer: CUSTOMERS[1],
      contract: {
        id: 'ctr_10311',
        code: 'CTR-10311',
        status: 'ACTIVE',
      },
      status: 'ELIGIBLE_FOR_CANCELLATION',
      priority: 'HIGH',
      daysOverdue: 133,
      outstandingAmount: '9430.90',
      assignedTo: ASSIGNEES[1],
      slaDueAt: new Date(Date.now() + 14_400_000).toISOString(),
      recentAttempts: [
        {
          id: 'att_0004',
          channel: 'PHONE',
          result: 'REFUSED',
          attemptedAt: new Date(Date.now() - 518_400_000).toISOString(),
        },
      ],
      activePromise: null,
      matrixContact: emptyMatrixContact(),
      ...buildMockDetailExtensions(
        '9430.90',
        [
          {
            id: 'att_0004',
            channel: 'PHONE',
            result: 'REFUSED',
            attemptedAt: new Date(Date.now() - 518_400_000).toISOString(),
          },
        ],
        null,
      ),
      createdAt: new Date(Date.now() - 3_024_000_000).toISOString(),
      updatedAt: new Date(Date.now() - 172_800_000).toISOString(),
    },
    case_0003: {
      id: 'case_0003',
      customer: CUSTOMERS[2],
      contract: {
        id: 'ctr_10187',
        code: 'CTR-10187',
        status: 'ACTIVE',
      },
      status: 'AWAITING_PAYMENT',
      priority: 'MEDIUM',
      daysOverdue: 101,
      outstandingAmount: '15120.40',
      assignedTo: ASSIGNEES[2],
      slaDueAt: new Date(Date.now() + 86_400_000).toISOString(),
      recentAttempts: [
        {
          id: 'att_0005',
          channel: 'PHONE',
          result: 'PROMISE_MADE',
          attemptedAt: new Date(Date.now() - 172_800_000).toISOString(),
        },
      ],
      activePromise: {
        id: 'prm_0001',
        status: 'ACTIVE',
        promisedAmount: '15120.40',
        promisedDate: new Date(Date.now() + 604_800_000).toISOString(),
      },
      matrixContact: emptyMatrixContact(),
      ...buildMockDetailExtensions(
        '15120.40',
        [
          {
            id: 'att_0005',
            channel: 'PHONE',
            result: 'PROMISE_MADE',
            attemptedAt: new Date(Date.now() - 172_800_000).toISOString(),
          },
        ],
        {
          id: 'prm_0001',
          status: 'ACTIVE',
          promisedAmount: '15120.40',
          promisedDate: new Date(Date.now() + 604_800_000).toISOString(),
        },
      ),
      createdAt: new Date(Date.now() - 2_678_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 43_200_000).toISOString(),
    },
    case_recovered: {
      id: 'case_recovered',
      customer: CUSTOMERS[3],
      contract: {
        id: 'ctr_10001',
        code: 'CTR-10001',
        status: 'ACTIVE',
      },
      status: 'RECOVERED',
      priority: 'LOW',
      daysOverdue: 0,
      outstandingAmount: '0.00',
      assignedTo: null,
      slaDueAt: null,
      recentAttempts: [],
      activePromise: null,
      matrixContact: emptyMatrixContact(),
      ...buildMockDetailExtensions('0.00', [], null),
      createdAt: new Date(Date.now() - 3_888_000_000).toISOString(),
      updatedAt: new Date(Date.now() - 172_800_000).toISOString(),
    },
  };
}

export function cloneMockCollectionCaseState<
  T extends MockCollectionCaseListRecord[] | Record<string, unknown>,
>(state: T): T {
  return structuredClone(state);
}
