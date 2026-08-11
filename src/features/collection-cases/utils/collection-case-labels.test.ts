import { describe, expect, it } from 'vitest';
import {
  canRevertCaseCancellation,
  canSendCaseToCancellation,
  getPromiseStatusLabel,
  getPromiseStatusVariant,
  getTimelineEventVariant,
} from '@/features/collection-cases/utils/collection-case-labels';

describe('getPromiseStatusVariant', () => {
  it('usa success para FULFILLED', () => {
    expect(getPromiseStatusVariant('FULFILLED')).toBe('success');
    expect(getPromiseStatusLabel('FULFILLED')).toBe('Cumprida');
  });

  it('usa danger para BROKEN', () => {
    expect(getPromiseStatusVariant('BROKEN')).toBe('danger');
    expect(getPromiseStatusLabel('BROKEN')).toBe('Descumprida');
  });

  it('usa neutral para CANCELLED e ACTIVE', () => {
    expect(getPromiseStatusVariant('CANCELLED')).toBe('neutral');
    expect(getPromiseStatusVariant('ACTIVE')).toBe('neutral');
    expect(getPromiseStatusLabel('CANCELLED')).toBe('Cancelada');
  });
});

describe('getTimelineEventVariant', () => {
  it('usa success para promessa cumprida', () => {
    expect(getTimelineEventVariant('PAYMENT_PROMISE_FULFILLED')).toBe(
      'success',
    );
  });

  it('usa danger para promessa descumprida', () => {
    expect(getTimelineEventVariant('PAYMENT_PROMISE_BROKEN')).toBe('danger');
  });

  it('usa neutral para demais eventos', () => {
    expect(getTimelineEventVariant('CASE_CREATED')).toBe('neutral');
    expect(getTimelineEventVariant('ATTEMPT_CREATED')).toBe('neutral');
    expect(getTimelineEventVariant('CASE_SENT_TO_CANCELLATION')).toBe(
      'neutral',
    );
    expect(getTimelineEventVariant('AUDIT_EVENT')).toBe('neutral');
  });
});

describe('canSendCaseToCancellation', () => {
  it('permite caso elegivel sem processo ativo', () => {
    expect(
      canSendCaseToCancellation({
        status: 'NO_RESPONSE',
        cancellationProcess: null,
      }),
    ).toBe(true);
  });

  it('bloqueia caso com processo de cancelamento ativo', () => {
    expect(
      canSendCaseToCancellation({
        status: 'NO_RESPONSE',
        cancellationProcess: { status: 'PENDING' },
      }),
    ).toBe(false);
  });

  it('bloqueia caso recuperado ou em cancelamento', () => {
    expect(
      canSendCaseToCancellation({
        status: 'RECOVERED',
        cancellationProcess: null,
      }),
    ).toBe(false);
    expect(
      canSendCaseToCancellation({
        status: 'CANCELLATION_IN_PROGRESS',
        cancellationProcess: null,
      }),
    ).toBe(false);
  });
});

describe('canRevertCaseCancellation', () => {
  it('permite reverter casos na esteira de cancelamento', () => {
    expect(canRevertCaseCancellation('ELIGIBLE_FOR_CANCELLATION')).toBe(true);
    expect(canRevertCaseCancellation('CANCELLATION_IN_PROGRESS')).toBe(true);
  });

  it('bloqueia reversao fora da esteira de cancelamento', () => {
    expect(canRevertCaseCancellation('IN_COLLECTION')).toBe(false);
    expect(canRevertCaseCancellation('RECOVERED')).toBe(false);
    expect(canRevertCaseCancellation('CLOSED')).toBe(false);
  });
});
