import type { ElevenMode } from '@/config/eleven.config';
import type { ElevenIntegrationStatusResponse } from '@/modules/integrations/eleven/dto/eleven-integration-status.response';

export function buildElevenIntegrationStatus(
  mode: ElevenMode,
): ElevenIntegrationStatusResponse {
  switch (mode) {
    case 'stub':
      return {
        mode,
        available: true,
        message: 'Integração Eleven em modo simulado.',
      };
    case 'disabled':
      return {
        mode,
        available: false,
        message: 'Integração Eleven desabilitada.',
      };
    case 'live':
      return {
        mode,
        available: true,
        message: 'Integração Eleven ativa.',
      };
  }
}
