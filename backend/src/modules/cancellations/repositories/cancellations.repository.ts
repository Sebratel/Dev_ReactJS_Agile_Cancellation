import type { CompleteCancellationStepDto } from '@/modules/cancellations/dto/complete-cancellation-step.dto';
import type { CancellationStepResponse } from '@/modules/cancellations/dto/cancellation-step.response';

export type CompleteCancellationStepInput = {
  notes?: string;
  externalProtocol?: string;
  completedAt?: string;
};

export type CompleteCancellationStepParams = {
  cancellationId: string;
  stepCode: string;
  input: CompleteCancellationStepInput;
  performedByUserId: string | null;
  performedByName: string | null;
  integrationMetadata?: Record<string, unknown>;
};

export type CompleteCancellationStepResult =
  | {
      outcome: 'success';
      step: CancellationStepResponse;
      processCompleted: boolean;
    }
  | { outcome: 'process_not_found' }
  | { outcome: 'step_not_found' }
  | { outcome: 'step_already_completed' };

export type ElevenRequestEligibilityResult =
  | { outcome: 'eligible' }
  | { outcome: 'process_not_found' }
  | { outcome: 'process_already_completed' }
  | { outcome: 'step_not_found' }
  | { outcome: 'step_already_completed' };

export type CancellationProcessContextResult =
  | {
      outcome: 'found';
      context: {
        cancellationId: string;
        processStatus: string;
        // Responsavel do caso de cobranca (autorizacao de escrita por dono).
        caseAssignedUserId: string | null;
        steps: Array<{
          stepCode: string;
          stepOrder: number;
          status: string;
        }>;
      };
    }
  | { outcome: 'process_not_found' };

export interface CancellationsRepository {
  getProcessContext(
    cancellationId: string,
  ): Promise<CancellationProcessContextResult>;

  validateElevenRequestEligibility(
    cancellationId: string,
  ): Promise<ElevenRequestEligibilityResult>;

  completeStep(
    params: CompleteCancellationStepParams,
  ): Promise<CompleteCancellationStepResult>;
}

export function mapCompleteCancellationStepDtoToInput(
  dto: CompleteCancellationStepDto,
): CompleteCancellationStepInput {
  return {
    notes: dto.notes,
    externalProtocol: dto.externalProtocol,
    completedAt: dto.completedAt,
  };
}
