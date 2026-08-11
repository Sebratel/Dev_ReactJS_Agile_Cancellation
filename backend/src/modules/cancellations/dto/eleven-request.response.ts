import type { CancellationStepResponse } from '@/modules/cancellations/dto/cancellation-step.response';

export type ElevenRequestResponse = {
  protocol: string;
  step: CancellationStepResponse;
};
