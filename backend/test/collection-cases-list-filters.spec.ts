import {
  buildCollectionCasesWhere,
  filterMockCollectionCases,
  type MockCollectionCaseListRecord,
} from '@/modules/collection-cases/utils/collection-cases-list.utils';

function createRecord(
  overrides: Partial<MockCollectionCaseListRecord> = {},
): MockCollectionCaseListRecord {
  return {
    id: 'case_test',
    customerName: 'Cliente Teste',
    contractCode: 'CTR-1',
    status: 'IN_COLLECTION',
    priority: 'HIGH',
    daysOverdue: 30,
    outstandingAmount: '1000.00',
    assignedTo: { id: 'usr_1', name: 'Operador' },
    slaDueAt: null,
    assignedUserId: 'usr_1',
    customerDocument: '00.000.000/0001-00',
    contractExternalId: 'EXT-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasCollectionAttempts: true,
    paymentPromiseStatuses: ['ACTIVE'],
    ...overrides,
  };
}

describe('collection-cases list filters', () => {
  const now = new Date('2026-06-10T12:00:00.000Z');

  it('filtra casos criados hoje no Prisma where', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, createdToday: true },
      now,
    );

    const createdAtFilter = where.createdAt as {
      gte: Date;
      lt: Date;
    };

    expect(createdAtFilter.gte).toBeInstanceOf(Date);
    expect(createdAtFilter.lt).toBeInstanceOf(Date);
    expect(createdAtFilter.lt.getTime() - createdAtFilter.gte.getTime()).toBe(
      86_400_000,
    );
  });

  it('filtra casos sem interacao no Prisma where', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, interactionStatus: 'none' },
      now,
    );

    expect(where.collectionAttempts).toEqual({ none: {} });
  });

  it('filtra casos com promessa ativa no Prisma where', () => {
    const where = buildCollectionCasesWhere(
      { page: 1, limit: 10, promiseStatus: 'ACTIVE' },
      now,
    );

    expect(where.paymentPromises).toEqual({
      some: { status: 'ACTIVE' },
    });
  });

  it('filtra casos criados hoje no mock', () => {
    const records = [
      createRecord({
        id: 'case_today',
        createdAt: new Date('2026-06-10T08:00:00.000Z').toISOString(),
      }),
      createRecord({
        id: 'case_old',
        createdAt: new Date('2026-06-09T08:00:00.000Z').toISOString(),
      }),
    ];

    const filtered = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, createdToday: true },
      now,
    );

    expect(filtered.map((record) => record.id)).toEqual(['case_today']);
  });

  it('filtra casos sem interacao no mock', () => {
    const records = [
      createRecord({ id: 'case_with', hasCollectionAttempts: true }),
      createRecord({ id: 'case_without', hasCollectionAttempts: false }),
    ];

    const filtered = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, interactionStatus: 'none' },
      now,
    );

    expect(filtered.map((record) => record.id)).toEqual(['case_without']);
  });

  it('filtra casos com promessa quebrada no mock', () => {
    const records = [
      createRecord({
        id: 'case_broken',
        paymentPromiseStatuses: ['BROKEN'],
      }),
      createRecord({
        id: 'case_active',
        paymentPromiseStatuses: ['ACTIVE'],
      }),
    ];

    const filtered = filterMockCollectionCases(
      records,
      { page: 1, limit: 10, promiseStatus: 'BROKEN' },
      now,
    );

    expect(filtered.map((record) => record.id)).toEqual(['case_broken']);
  });
});
