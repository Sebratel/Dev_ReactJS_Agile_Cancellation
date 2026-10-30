import { classifyHsmStatus } from '@/modules/hsm-delivery/hsm-delivery-sync.service';

describe('classifyHsmStatus', () => {
  it.each([
    [1, 'SENT'],
    [2, 'DELIVERED'],
    [3, 'READ'],
  ])('status_id %i => %s', (statusId, expected) => {
    expect(classifyHsmStatus(statusId)).toBe(expected);
  });

  it.each([0, 16, 17, 87, 88, 99, 105, 106, 117, 118, 127])(
    'status_id %i (falha da Matrix/Meta) => FAILED',
    (statusId) => {
      expect(classifyHsmStatus(statusId)).toBe('FAILED');
    },
  );
});
