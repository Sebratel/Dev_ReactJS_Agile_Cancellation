import {
  canSendCollectionCaseToCancellation,
  hasActiveCancellationProcess,
} from '@/modules/collection-cases/utils/send-to-cancellation.utils';

describe('send-to-cancellation.utils', () => {
  it('bloqueia status finalizados', () => {
    expect(canSendCollectionCaseToCancellation('CLOSED')).toBe(false);
    expect(canSendCollectionCaseToCancellation('RECOVERED')).toBe(false);
    expect(
      canSendCollectionCaseToCancellation('CANCELLATION_IN_PROGRESS'),
    ).toBe(false);
  });

  it('permite status elegiveis', () => {
    expect(canSendCollectionCaseToCancellation('NO_RESPONSE')).toBe(true);
    expect(
      canSendCollectionCaseToCancellation('ELIGIBLE_FOR_CANCELLATION'),
    ).toBe(true);
  });

  it('detecta processo de cancelamento ativo', () => {
    expect(hasActiveCancellationProcess([{ status: 'PENDING' }])).toBe(true);
    expect(hasActiveCancellationProcess([{ status: 'COMPLETED' }])).toBe(false);
  });
});
