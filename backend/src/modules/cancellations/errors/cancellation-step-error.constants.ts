export const CANCELLATION_STEP_ERROR_CODES = {
  STEP_OUT_OF_ORDER: 'step_out_of_order',
  STEP_REQUIRES_INTEGRATION: 'step_requires_integration',
  STEP_PERMISSION_DENIED: 'step_permission_denied',
  CANCELLATION_ALREADY_COMPLETED: 'cancellation_already_completed',
} as const;

export type CancellationStepErrorCode =
  (typeof CANCELLATION_STEP_ERROR_CODES)[keyof typeof CANCELLATION_STEP_ERROR_CODES];

export type CancellationStepErrorPayload = {
  message: string;
  code: CancellationStepErrorCode;
  details?: string;
};
