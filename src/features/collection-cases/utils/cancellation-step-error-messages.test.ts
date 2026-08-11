import { describe, expect, it } from 'vitest';
import {
  CANCELLATION_STEP_ERROR_CODES,
  getCancellationStepErrorMessage,
  getElevenRequestErrorMessage,
} from '@/features/collection-cases/utils/cancellation-step-error-messages';
import { ApiError } from '@/services/api/api-error';

describe('cancellation-step-error-messages', () => {
  it('mapeia codigos de erro de politica para mensagens amigaveis', () => {
    expect(
      getCancellationStepErrorMessage(
        new ApiError(409, {
          message: 'raw',
          code: CANCELLATION_STEP_ERROR_CODES.STEP_OUT_OF_ORDER,
        }),
      ),
    ).toContain('etapas anteriores');

    expect(
      getCancellationStepErrorMessage(
        new ApiError(409, {
          message: 'raw',
          code: CANCELLATION_STEP_ERROR_CODES.STEP_REQUIRES_INTEGRATION,
        }),
      ),
    ).toContain('integração Eleven');

    expect(
      getCancellationStepErrorMessage(
        new ApiError(403, {
          message: 'raw',
          code: CANCELLATION_STEP_ERROR_CODES.STEP_PERMISSION_DENIED,
        }),
      ),
    ).toContain('permissão');

    expect(
      getCancellationStepErrorMessage(
        new ApiError(409, {
          message: 'raw',
          code: CANCELLATION_STEP_ERROR_CODES.CANCELLATION_ALREADY_COMPLETED,
        }),
      ),
    ).toContain('já foi concluído');
  });

  it('usa mensagem da API quando codigo nao e mapeado', () => {
    expect(
      getCancellationStepErrorMessage(
        new ApiError(500, {
          message: 'Erro interno especifico.',
        }),
      ),
    ).toBe('Erro interno especifico.');
  });

  it('usa fallback para Eleven quando erro e desconhecido', () => {
    expect(getElevenRequestErrorMessage(new Error('falha'))).toContain(
      'solicitação Eleven',
    );
  });
});
