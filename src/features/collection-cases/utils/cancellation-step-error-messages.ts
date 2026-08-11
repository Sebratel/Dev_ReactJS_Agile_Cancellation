import { ApiError } from '@/services/api/api-error';

export const CANCELLATION_STEP_ERROR_CODES = {
  STEP_OUT_OF_ORDER: 'step_out_of_order',
  STEP_REQUIRES_INTEGRATION: 'step_requires_integration',
  STEP_PERMISSION_DENIED: 'step_permission_denied',
  CANCELLATION_ALREADY_COMPLETED: 'cancellation_already_completed',
} as const;

const DEFAULT_COMPLETE_MESSAGE = 'Não foi possível concluir a etapa.';
const DEFAULT_ELEVEN_MESSAGE = 'Não foi possível abrir a solicitação Eleven.';

const ERROR_MESSAGES: Record<string, string> = {
  [CANCELLATION_STEP_ERROR_CODES.STEP_OUT_OF_ORDER]:
    'Esta etapa só pode ser concluída após as etapas anteriores.',
  [CANCELLATION_STEP_ERROR_CODES.STEP_REQUIRES_INTEGRATION]:
    'Esta etapa exige a ação específica de integração Eleven.',
  [CANCELLATION_STEP_ERROR_CODES.STEP_PERMISSION_DENIED]:
    'Seu perfil não tem permissão para concluir esta etapa.',
  [CANCELLATION_STEP_ERROR_CODES.CANCELLATION_ALREADY_COMPLETED]:
    'O processo de cancelamento já foi concluído.',
};

export function getCancellationStepErrorMessage(
  error: unknown,
  fallback = DEFAULT_COMPLETE_MESSAGE,
) {
  if (error instanceof ApiError) {
    if (error.code && ERROR_MESSAGES[error.code]) {
      return ERROR_MESSAGES[error.code];
    }

    return error.message || fallback;
  }

  return fallback;
}

export function getElevenRequestErrorMessage(error: unknown) {
  return getCancellationStepErrorMessage(error, DEFAULT_ELEVEN_MESSAGE);
}
