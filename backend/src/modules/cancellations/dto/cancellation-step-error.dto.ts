import type {
  CancellationStepErrorCode,
  CancellationStepErrorPayload,
} from '@/modules/cancellations/errors/cancellation-step-error.constants';

export type { CancellationStepErrorCode, CancellationStepErrorPayload };

export class CancellationStepErrorDto implements CancellationStepErrorPayload {
  message: string;
  code: CancellationStepErrorCode;
  details?: string;

  constructor(payload: CancellationStepErrorPayload) {
    this.message = payload.message;
    this.code = payload.code;
    this.details = payload.details;
  }
}
