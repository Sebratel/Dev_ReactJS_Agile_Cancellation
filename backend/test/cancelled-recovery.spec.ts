import {
  hasQualifyingRecoveryContact,
  resolveCancelledRecoveryOutcome,
  type CancelledRecoveryAttempt,
} from '@/modules/erp-sync/cancelled-recovery';

const CYCLE = new Date('2026-11-01T12:00:00.000Z');
const REACTIVATED = new Date('2026-11-10T15:00:00.000Z');
const NOW = new Date('2026-11-11T10:00:00.000Z');

function attempt(
  overrides: Partial<CancelledRecoveryAttempt> = {},
): CancelledRecoveryAttempt {
  return {
    attemptedAt: new Date('2026-11-05T14:00:00.000Z'),
    result: 'CONTACTED',
    notes: 'Cliente aceitou voltar',
    isAutomatic: false,
    ...overrides,
  };
}

describe('hasQualifyingRecoveryContact', () => {
  it('aceita contato efetivo com observacao dentro do ciclo e antes da reativacao', () => {
    expect(hasQualifyingRecoveryContact([attempt()], CYCLE, REACTIVATED)).toBe(
      true,
    );
  });

  it('exige observacao preenchida', () => {
    expect(
      hasQualifyingRecoveryContact(
        [attempt({ notes: null }), attempt({ notes: '   ' })],
        CYCLE,
        REACTIVATED,
      ),
    ).toBe(false);
  });

  it('ignora contato sem efeito (nao atendeu, caixa postal) e automatico', () => {
    expect(
      hasQualifyingRecoveryContact(
        [
          attempt({ result: 'NO_ANSWER' }),
          attempt({ result: 'VOICEMAIL' }),
          attempt({ isAutomatic: true }),
        ],
        CYCLE,
        REACTIVATED,
      ),
    ).toBe(false);
  });

  it('ignora contato anterior ao ciclo (antes da devolucao a carteira)', () => {
    expect(
      hasQualifyingRecoveryContact(
        [attempt({ attemptedAt: new Date('2026-10-20T10:00:00.000Z') })],
        CYCLE,
        REACTIVATED,
      ),
    ).toBe(false);
  });

  it('ignora contato depois do dia da reativacao, mas aceita no mesmo dia', () => {
    expect(
      hasQualifyingRecoveryContact(
        [attempt({ attemptedAt: new Date('2026-11-11T09:00:00.000Z') })],
        CYCLE,
        REACTIVATED,
      ),
    ).toBe(false);
    expect(
      hasQualifyingRecoveryContact(
        [attempt({ attemptedAt: new Date('2026-11-10T20:00:00.000Z') })],
        CYCLE,
        REACTIVATED,
      ),
    ).toBe(true);
  });
});

describe('resolveCancelledRecoveryOutcome', () => {
  it('aguarda enquanto o contrato nao esta Normal no ERP', () => {
    for (const status of ['Cancelado', 'Encerrado', null]) {
      expect(
        resolveCancelledRecoveryOutcome({
          erp: { erpContractStatus: status, reactivatedAt: REACTIVATED },
          cycleStartedAt: CYCLE,
          attempts: [attempt()],
          now: NOW,
        }),
      ).toEqual({ kind: 'waiting' });
    }
    expect(
      resolveCancelledRecoveryOutcome({
        erp: undefined,
        cycleStartedAt: CYCLE,
        attempts: [attempt()],
        now: NOW,
      }),
    ).toEqual({ kind: 'waiting' });
  });

  it('recuperado: Normal no ERP com contato qualificado antes da reativacao', () => {
    expect(
      resolveCancelledRecoveryOutcome({
        erp: { erpContractStatus: 'Normal', reactivatedAt: REACTIVATED },
        cycleStartedAt: CYCLE,
        attempts: [attempt()],
        now: NOW,
      }),
    ).toEqual({ kind: 'recovered', reactivatedAt: REACTIVATED });
  });

  it('reativado sem credito: voltou sem contato qualificado', () => {
    expect(
      resolveCancelledRecoveryOutcome({
        erp: { erpContractStatus: 'Normal', reactivatedAt: REACTIVATED },
        cycleStartedAt: CYCLE,
        attempts: [attempt({ notes: '' })],
        now: NOW,
      }),
    ).toEqual({ kind: 'reactivated', reactivatedAt: REACTIVATED });
  });

  it('sem evento de reativacao usa o momento da deteccao', () => {
    expect(
      resolveCancelledRecoveryOutcome({
        erp: { erpContractStatus: 'Normal', reactivatedAt: null },
        cycleStartedAt: CYCLE,
        attempts: [attempt()],
        now: NOW,
      }),
    ).toEqual({ kind: 'recovered', reactivatedAt: NOW });
  });
});
