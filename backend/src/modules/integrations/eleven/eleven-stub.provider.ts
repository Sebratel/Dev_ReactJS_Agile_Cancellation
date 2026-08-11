import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  CreateElevenCancellationRequestInput,
  CreateElevenCancellationRequestResult,
  ElevenProvider,
} from '@/modules/integrations/eleven/eleven-provider.interface';

function formatDatePart(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

export function buildElevenStubProtocol(
  cancellationId: string,
  now: Date = new Date(),
) {
  const datePart = formatDatePart(now);
  const hash = createHash('sha256').update(cancellationId).digest('hex');
  const suffix = hash.slice(0, 4).toUpperCase();

  return `ELEVEN-STUB-${datePart}-${suffix}`;
}

@Injectable()
export class ElevenStubProvider implements ElevenProvider {
  createCancellationRequest(
    input: CreateElevenCancellationRequestInput,
  ): Promise<CreateElevenCancellationRequestResult> {
    return Promise.resolve({
      protocol: buildElevenStubProtocol(input.cancellationId),
    });
  }
}
