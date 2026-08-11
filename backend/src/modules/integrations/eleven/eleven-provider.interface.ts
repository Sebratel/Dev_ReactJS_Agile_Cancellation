export type CreateElevenCancellationRequestInput = {
  cancellationId: string;
  notes?: string;
};

export type CreateElevenCancellationRequestResult = {
  protocol: string;
};

export interface ElevenProvider {
  createCancellationRequest(
    input: CreateElevenCancellationRequestInput,
  ): Promise<CreateElevenCancellationRequestResult>;
}
