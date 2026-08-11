import { buildElevenIntegrationStatus } from '@/modules/integrations/eleven/utils/eleven-integration-status.util';

describe('eleven-integration-status.util', () => {
  it('retorna stub disponivel', () => {
    expect(buildElevenIntegrationStatus('stub')).toEqual({
      mode: 'stub',
      available: true,
      message: 'Integração Eleven em modo simulado.',
    });
  });

  it('retorna disabled indisponivel', () => {
    expect(buildElevenIntegrationStatus('disabled')).toEqual({
      mode: 'disabled',
      available: false,
      message: 'Integração Eleven desabilitada.',
    });
  });

  it('retorna live disponivel', () => {
    expect(buildElevenIntegrationStatus('live')).toEqual({
      mode: 'live',
      available: true,
      message: 'Integração Eleven ativa.',
    });
  });
});
