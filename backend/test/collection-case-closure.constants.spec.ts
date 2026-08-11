import { COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED } from '@/modules/cancellations/constants/collection-case-closure.constants';

describe('collection-case-closure.constants', () => {
  it('usa CLOSED como encerramento por cancelamento concluido', () => {
    expect(COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED).toBe('CLOSED');
  });
});
