import { describe, expect, it } from 'vitest';
import {
  getCancellationStatusVariant,
  getCancellationStepStatusVariant,
  getTimelineEventVariant,
} from '@/features/collection-cases/utils/collection-case-labels';

describe('cancellation step labels', () => {
  it('usa success para status COMPLETED', () => {
    expect(getCancellationStepStatusVariant('COMPLETED')).toBe('success');
    expect(getCancellationStatusVariant('COMPLETED')).toBe('success');
    expect(getTimelineEventVariant('CANCELLATION_STEP_COMPLETED')).toBe(
      'success',
    );
  });

  it('usa neutral para status pendente', () => {
    expect(getCancellationStepStatusVariant('PENDING')).toBe('neutral');
    expect(getCancellationStepStatusVariant('IN_PROGRESS')).toBe('neutral');
  });
});
