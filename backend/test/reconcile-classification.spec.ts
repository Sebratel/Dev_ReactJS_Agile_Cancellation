import {
  isContractRegularized,
  isContractRenegotiated,
  resolveRecoveredCaseIds,
  type ErpContractReconcileStatus,
} from '@/modules/erp-sync/reconcile-classification';

function status(
  overrides: Partial<ErpContractReconcileStatus>,
): ErpContractReconcileStatus {
  return {
    erpContractStatus: 'Normal',
    openOverdueTitles: 0,
    hasRenegotiation: false,
    openUnpaidBalance: 0,
    ...overrides,
  };
}

describe('isContractRegularized', () => {
  it('é pagamento quando status elegível, sem títulos vencidos e sem renegociação', () => {
    expect(isContractRegularized(status({ erpContractStatus: 'Normal' }))).toBe(
      true,
    );
    expect(
      isContractRegularized(
        status({ erpContractStatus: 'Bloqueio Financeiro' }),
      ),
    ).toBe(true);
  });

  it('NÃO é pagamento quando ainda há títulos vencidos em aberto', () => {
    expect(isContractRegularized(status({ openOverdueTitles: 2 }))).toBe(false);
  });

  it('NÃO é pagamento quando o status não é elegível (cancelado)', () => {
    expect(
      isContractRegularized(status({ erpContractStatus: 'Cancelado' })),
    ).toBe(false);
    expect(
      isContractRegularized(status({ erpContractStatus: null })),
    ).toBe(false);
  });

  it('NÃO é pagamento quando houve renegociação com saldo em aberto', () => {
    expect(
      isContractRegularized(
        status({ hasRenegotiation: true, openUnpaidBalance: 359.64 }),
      ),
    ).toBe(false);
  });

  it('É pagamento quando renegociou MAS quitou tudo (sem saldo)', () => {
    expect(
      isContractRegularized(
        status({ hasRenegotiation: true, openUnpaidBalance: 0 }),
      ),
    ).toBe(true);
  });

  it('NÃO é pagamento quando o contrato não foi encontrado no ERP', () => {
    expect(isContractRegularized(undefined)).toBe(false);
  });
});

describe('isContractRenegotiated', () => {
  it('é renegociação: elegível, sem vencidos, com renegociação e saldo em aberto', () => {
    expect(
      isContractRenegotiated(
        status({ hasRenegotiation: true, openUnpaidBalance: 211.13 }),
      ),
    ).toBe(true);
  });

  it('NÃO é renegociação quando não houve renegociação', () => {
    expect(
      isContractRenegotiated(status({ hasRenegotiation: false, openUnpaidBalance: 100 })),
    ).toBe(false);
  });

  it('NÃO é renegociação quando renegociou mas não há saldo (foi pago)', () => {
    expect(
      isContractRenegotiated(
        status({ hasRenegotiation: true, openUnpaidBalance: 0 }),
      ),
    ).toBe(false);
  });

  it('NÃO é renegociação quando o contrato está cancelado (cancelamento vence)', () => {
    expect(
      isContractRenegotiated(
        status({
          erpContractStatus: 'Cancelado',
          hasRenegotiation: true,
          openUnpaidBalance: 329.67,
        }),
      ),
    ).toBe(false);
  });

  it('renegociação e pagamento são mutuamente exclusivos', () => {
    const reneg = status({ hasRenegotiation: true, openUnpaidBalance: 99.9 });
    expect(isContractRenegotiated(reneg)).toBe(true);
    expect(isContractRegularized(reneg)).toBe(false);
  });
});

describe('resolveRecoveredCaseIds', () => {
  const cycleStart = new Date('2026-09-20T00:00:00.000Z');

  it('conta tentativa manual dentro do ciclo atual', () => {
    const recovered = resolveRecoveredCaseIds(
      [
        {
          collectionCaseId: 'case_1',
          attemptedAt: new Date('2026-09-21T10:00:00.000Z'),
        },
      ],
      new Map([['case_1', cycleStart]]),
    );

    expect(recovered.has('case_1')).toBe(true);
  });

  it('IGNORA tentativa manual de ciclo anterior (antes do cycleStartedAt)', () => {
    const recovered = resolveRecoveredCaseIds(
      [
        {
          collectionCaseId: 'case_1',
          attemptedAt: new Date('2026-08-01T10:00:00.000Z'),
        },
      ],
      new Map([['case_1', cycleStart]]),
    );

    expect(recovered.has('case_1')).toBe(false);
  });

  it('sem cycleStartedAt (legado) conta qualquer tentativa manual', () => {
    const recovered = resolveRecoveredCaseIds(
      [
        {
          collectionCaseId: 'case_1',
          attemptedAt: new Date('2020-01-01T00:00:00.000Z'),
        },
      ],
      new Map([['case_1', null]]),
    );

    expect(recovered.has('case_1')).toBe(true);
  });

  it('sem tentativas → conjunto vazio', () => {
    const recovered = resolveRecoveredCaseIds([], new Map());
    expect(recovered.size).toBe(0);
  });
});
