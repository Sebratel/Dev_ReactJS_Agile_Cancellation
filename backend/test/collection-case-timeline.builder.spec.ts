import {
  buildCollectionCaseTimeline,
  getTimelineEventTypeLabel,
} from '@/modules/collection-cases/utils/collection-case-timeline.builder';

describe('buildCollectionCaseTimeline', () => {
  const baseInput = {
    caseId: 'case_0001',
    caseCreatedAt: '2026-01-01T10:00:00.000Z',
    customerName: 'Construtora Horizonte',
    attempts: [
      {
        id: 'att_0001',
        channel: 'PHONE',
        result: 'NO_ANSWER',
        attemptedAt: '2026-02-01T12:00:00.000Z',
        notes: 'Cliente nao atendeu.',
        actorName: 'Marina Lopes',
      },
    ],
    promises: [
      {
        id: 'prm_0001',
        promisedAmount: '2500.00',
        promisedDate: '2026-03-01T00:00:00.000Z',
        notes: 'Acordo confirmado.',
        createdAt: '2026-02-10T09:00:00.000Z',
        fulfilledAt: '2026-03-02T15:00:00.000Z',
        brokenAt: null,
        cancelledAt: null,
        createdActorName: 'Marina Lopes',
        fulfilledActorName: 'Marina Lopes',
      },
      {
        id: 'prm_0002',
        promisedAmount: '900.00',
        promisedDate: '2026-04-01T00:00:00.000Z',
        notes: null,
        createdAt: '2026-03-15T09:00:00.000Z',
        fulfilledAt: null,
        brokenAt: '2026-04-05T11:00:00.000Z',
        cancelledAt: null,
        brokenActorName: 'Carlos Nunes',
      },
    ],
    auditLogs: [
      {
        id: 'audit_0002',
        action: 'EXPORT',
        createdAt: '2026-02-20T08:00:00.000Z',
        actorName: 'Marina Lopes',
        metadata: {},
      },
    ],
    cancellationSentEvents: [
      {
        id: 'can_0001',
        reason: 'Cliente recusou acordo.',
        notes: 'Encaminhado apos tentativas.',
        occurredAt: '2026-03-20T10:00:00.000Z',
        actorName: 'Marina Lopes',
      },
    ],
    cancellationStepCompletedEvents: [],
    cancellationProcessCompletedEvents: [],
  };

  it('inclui evento de criacao do caso', () => {
    const timeline = buildCollectionCaseTimeline(baseInput);

    expect(timeline.events.some((event) => event.type === 'CASE_CREATED')).toBe(
      true,
    );
  });

  it('inclui tentativas de cobranca', () => {
    const timeline = buildCollectionCaseTimeline(baseInput);

    expect(
      timeline.events.some(
        (event) =>
          event.type === 'ATTEMPT_CREATED' &&
          event.metadata?.attemptId === 'att_0001',
      ),
    ).toBe(true);
  });

  it('inclui promessas e alteracoes de status', () => {
    const timeline = buildCollectionCaseTimeline(baseInput);

    expect(
      timeline.events.some((event) => event.type === 'PAYMENT_PROMISE_CREATED'),
    ).toBe(true);
    expect(
      timeline.events.some(
        (event) => event.type === 'PAYMENT_PROMISE_FULFILLED',
      ),
    ).toBe(true);
    expect(
      timeline.events.some((event) => event.type === 'PAYMENT_PROMISE_BROKEN'),
    ).toBe(true);
  });

  it('inclui eventos de auditoria nao cobertos pelas entidades', () => {
    const timeline = buildCollectionCaseTimeline(baseInput);

    expect(
      timeline.events.some(
        (event) =>
          event.type === 'AUDIT_EVENT' &&
          event.metadata?.auditLogId === 'audit_0002',
      ),
    ).toBe(true);
  });

  it('inclui evento de encaminhamento para cancelamento', () => {
    const timeline = buildCollectionCaseTimeline(baseInput);

    expect(
      timeline.events.some(
        (event) => event.type === 'CASE_SENT_TO_CANCELLATION',
      ),
    ).toBe(true);
  });

  it('ordena eventos por data desc', () => {
    const timeline = buildCollectionCaseTimeline(baseInput);
    const timestamps = timeline.events.map((event) =>
      new Date(event.occurredAt).getTime(),
    );

    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it('expoe labels amigaveis para tipos de evento', () => {
    expect(getTimelineEventTypeLabel('PAYMENT_PROMISE_FULFILLED')).toBe(
      'Promessa cumprida',
    );
  });
});
