import { HttpStatus } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import {
  CANCELLATION_STEP_ERROR_CODES,
  type CancellationStepErrorCode,
} from '@/modules/cancellations/errors/cancellation-step-error.constants';

export class CancellationStepPolicyException extends AppException {
  constructor(
    message: string,
    code: CancellationStepErrorCode,
    status: HttpStatus,
    details?: string,
  ) {
    super(message, status, { code, details });
  }
}

export function throwStepOutOfOrder(
  requiredStepCode: string,
  stepCode: string,
) {
  throw new CancellationStepPolicyException(
    `Etapa ${stepCode} nao pode ser concluida antes de ${requiredStepCode}.`,
    CANCELLATION_STEP_ERROR_CODES.STEP_OUT_OF_ORDER,
    HttpStatus.CONFLICT,
    requiredStepCode,
  );
}

export function throwStepRequiresIntegration(stepCode: string) {
  throw new CancellationStepPolicyException(
    `Etapa ${stepCode} exige conclusao via integracao Eleven.`,
    CANCELLATION_STEP_ERROR_CODES.STEP_REQUIRES_INTEGRATION,
    HttpStatus.CONFLICT,
    stepCode,
  );
}

export function throwStepPermissionDenied(stepCode: string) {
  throw new CancellationStepPolicyException(
    `Usuario sem permissao para concluir a etapa ${stepCode}.`,
    CANCELLATION_STEP_ERROR_CODES.STEP_PERMISSION_DENIED,
    HttpStatus.FORBIDDEN,
    stepCode,
  );
}

export function throwCancellationAlreadyCompleted(cancellationId: string) {
  throw new CancellationStepPolicyException(
    `Processo de cancelamento ${cancellationId} ja foi concluido.`,
    CANCELLATION_STEP_ERROR_CODES.CANCELLATION_ALREADY_COMPLETED,
    HttpStatus.CONFLICT,
    cancellationId,
  );
}
