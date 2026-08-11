import { buildElevenStubProtocol } from '@/modules/integrations/eleven/eleven-stub.provider';

describe('ElevenStubProvider', () => {
  it('gera protocolo no formato ELEVEN-STUB-YYYYMMDD-XXXX', () => {
    const protocol = buildElevenStubProtocol(
      'can_test_001',
      new Date('2026-06-08T12:00:00.000Z'),
    );

    expect(protocol).toMatch(/^ELEVEN-STUB-\d{8}-[A-F0-9]{4}$/);
    expect(protocol.startsWith('ELEVEN-STUB-20260608-')).toBe(true);
  });

  it('gera protocolo deterministico para o mesmo cancellationId', () => {
    const first = buildElevenStubProtocol(
      'can_test_001',
      new Date('2026-06-08T12:00:00.000Z'),
    );
    const second = buildElevenStubProtocol(
      'can_test_001',
      new Date('2026-06-08T15:00:00.000Z'),
    );

    expect(first).toBe(second);
  });

  it('gera protocolos diferentes para cancellationIds diferentes', () => {
    const first = buildElevenStubProtocol(
      'can_test_001',
      new Date('2026-06-08T12:00:00.000Z'),
    );
    const second = buildElevenStubProtocol(
      'can_test_002',
      new Date('2026-06-08T12:00:00.000Z'),
    );

    expect(first).not.toBe(second);
  });
});
