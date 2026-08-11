import { httpClient } from '@/services/api/http-client';
import type {
  CancellationStepResponse,
  CompleteCancellationStepPayload,
  CreateElevenCancellationRequestPayload,
  ElevenCancellationRequestResponse,
} from '@/features/cancellations/types/cancellations-api.types';

export async function completeCancellationStep(
  cancellationId: string,
  stepCode: string,
  payload: CompleteCancellationStepPayload,
) {
  const response = await httpClient.request<CancellationStepResponse>({
    path: `/cancellations/${cancellationId}/steps/${stepCode}/complete`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function createElevenCancellationRequest(
  cancellationId: string,
  payload: CreateElevenCancellationRequestPayload,
) {
  const response = await httpClient.request<ElevenCancellationRequestResponse>({
    path: `/cancellations/${cancellationId}/eleven/request`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}
