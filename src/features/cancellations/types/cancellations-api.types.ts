export type CompleteCancellationStepPayload = {
  notes?: string;
  externalProtocol?: string;
  completedAt?: string;
};

export type CreateElevenCancellationRequestPayload = {
  notes?: string;
};

export type ElevenCancellationRequestResponse = {
  protocol: string;
  step: CancellationStepResponse;
};

export type CancellationStepResponse = {
  id: string;
  cancellationProcessId: string;
  stepCode: string;
  name: string;
  stepOrder: number;
  status: string;
  externalProtocol: string | null;
  notes: string | null;
  completedAt: string | null;
  completedByName: string | null;
};
