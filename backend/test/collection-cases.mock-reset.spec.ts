import {
  mockCollectionCaseDetails,
  resetMockCollectionCases,
} from '@/modules/collection-cases/mocks/collection-cases.mock';
import { CollectionCasesMockRepository } from '@/modules/collection-cases/repositories/collection-cases-mock.repository';

describe('resetMockCollectionCases', () => {
  const repository = new CollectionCasesMockRepository();

  beforeEach(() => {
    resetMockCollectionCases();
  });

  it('restaura status e cancelamento apos mutacao', async () => {
    await repository.sendToCancellation({
      caseId: 'case_0002',
      input: { reason: 'Motivo de teste.', assignedUserId: 'usr_cancel' },
      performedByUserId: 'usr_marina',
    });

    const mutated = await repository.getCaseById('case_0002');

    expect(mutated?.status).toBe('CANCELLATION_IN_PROGRESS');
    expect(mutated?.cancellationProcess).not.toBeNull();

    resetMockCollectionCases();

    const restored = await repository.getCaseById('case_0002');

    expect(restored?.status).toBe('ELIGIBLE_FOR_CANCELLATION');
    expect(restored?.cancellationProcess).toBeNull();
    expect(mockCollectionCaseDetails.case_0002?.status).toBe(
      'ELIGIBLE_FOR_CANCELLATION',
    );
  });
});
