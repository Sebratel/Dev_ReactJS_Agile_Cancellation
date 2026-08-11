import type { CollectionCaseListItemResponse } from '@/modules/collection-cases/dto/collection-case-list-item.response';
import type { CollectionCaseDetailsResponse } from '@/modules/collection-cases/dto/collection-case-details.response';
import {
  cloneMockCollectionCaseState,
  createMockCollectionCaseDetails,
  createMockCollectionCaseListItems,
  createMockCollectionCaseListRecords,
} from '@/modules/collection-cases/mocks/collection-cases.mock.factory';
import type { MockCollectionCaseListRecord } from '@/modules/collection-cases/utils/collection-cases-list.utils';

const initialListRecordsSnapshot = createMockCollectionCaseListRecords();
const initialDetailsSnapshot = createMockCollectionCaseDetails();

export const mockCollectionCaseListRecords: MockCollectionCaseListRecord[] =
  cloneMockCollectionCaseState(initialListRecordsSnapshot);

export const mockCollectionCaseListItems: CollectionCaseListItemResponse[] =
  createMockCollectionCaseListItems(initialListRecordsSnapshot);

export const mockCollectionCaseDetails: Record<
  string,
  CollectionCaseDetailsResponse
> = cloneMockCollectionCaseState(initialDetailsSnapshot);

export type MockAuditLogEntry = {
  entityType: string;
  entityId: string;
  action: string;
  performedByUserId: string | null;
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export const mockAuditLogs: MockAuditLogEntry[] = [];

export function pushMockAuditLog(entry: MockAuditLogEntry) {
  mockAuditLogs.push(entry);
}

export function resetMockAuditLogs() {
  mockAuditLogs.length = 0;
}

export function resetMockCollectionCases() {
  resetMockAuditLogs();

  mockCollectionCaseListRecords.splice(
    0,
    mockCollectionCaseListRecords.length,
    ...cloneMockCollectionCaseState(initialListRecordsSnapshot),
  );

  for (const key of Object.keys(mockCollectionCaseDetails)) {
    delete mockCollectionCaseDetails[key];
  }

  Object.assign(
    mockCollectionCaseDetails,
    cloneMockCollectionCaseState(initialDetailsSnapshot),
  );
}

const MOCK_ASSIGNEE_NAMES = {
  usr_marina: 'Marina Lopes',
  usr_carlos: 'Carlos Nunes',
  usr_rafaela: 'Rafaela Costa',
  usr_paulo: 'Paulo Nogueira',
} as const;

export function resolveMockActorName(userId: string | null | undefined) {
  if (!userId) {
    return null;
  }

  return (
    MOCK_ASSIGNEE_NAMES[userId as keyof typeof MOCK_ASSIGNEE_NAMES] ?? null
  );
}
