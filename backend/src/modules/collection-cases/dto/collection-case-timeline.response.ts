export type CollectionCaseTimelineEventType =
  | 'CASE_CREATED'
  | 'ATTEMPT_CREATED'
  | 'PAYMENT_PROMISE_CREATED'
  | 'PAYMENT_PROMISE_FULFILLED'
  | 'PAYMENT_PROMISE_BROKEN'
  | 'PAYMENT_PROMISE_CANCELLED'
  | 'CASE_SENT_TO_CANCELLATION'
  | 'CANCELLATION_STEP_COMPLETED'
  | 'CANCELLATION_PROCESS_COMPLETED'
  | 'AUDIT_EVENT';

export type CollectionCaseTimelineEvent = {
  id: string;
  type: CollectionCaseTimelineEventType;
  title: string;
  description: string;
  occurredAt: string;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
};

export type CollectionCaseTimelineResponse = {
  caseId: string;
  events: CollectionCaseTimelineEvent[];
};
