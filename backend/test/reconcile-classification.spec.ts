import {
  isContractRegularized,
  resolveReconcileOutcome,
  resolveRecoveredCaseIds,
  type ErpContractReconcileStatus,
} from '@/modules/erp-sync/reconcile-classification';

function status(
  overrides: Partial<ErpContractReconcileStatus>,
): ErpContractReconcileStatus {
  return {
    erpContractStatus: 'Normal',
    openOverdueTitles: 0,
    ...overrides,
  };
}

describe('isContractRegularized', () => {
  it('regularizado quando status elegível e sem títulos vencidos', () => {
    expect(isContractRegularized(status({ erpContractStatus: 'Normal' }))).toBe(true);
    expect(isContractRegularized(status({ erpContractStatus: 'Bloqueio Financeiro' }))).toBe(true);
  });

  it('NÃO é regularizado com título vencido em aberto', () => {
    expect(isContractRegularized(status({ openOverdueTitles: 2 }))).toBe(false);
  });

  it('NÃO é regularizado quando o status não é elegível (cancelado)', () => {
    expect(isContractRegularized(status({ erpContractStatus: 'Cancelado' }))).toBe(false);
    expect(isContractRegularized(status({ erpContractStatus: null }))).toBe(false);
  });

  it('NÃO é regularizado quando o contrato não foi encontrado', () => {
    expect(isContractRegularized(undefined)).toBe(false);
  });
});

describe('resolveReconcileOutcome (anti falso positivo de receita)', () => {
  it('PAGO só com regularização E prova de pagamento', () => {
    expect(resolveReconcileOutcome(status({}), true)).toBe('paid');
  });

  it('regularizado MAS sem prova de pagamento -> unresolved', () => {
    expect(resolveReconcileOutcome(status({}), false)).toBe('unresolved');
  });

  it('cancelado quando o contrato não está mais elegível', () => {
    expect(resolveReconcileOutcome(status({ erpContractStatus: 'Cancelado' }), true)).toBe('cancelled');
  });

  it('cancelado quando o contrato não foi encontrado', () => {
    expect(resolveReconcileOutcome(undefined, true)).toBe('cancelled');
  });

  it('ainda com vencido em aberto e sem pagamento -> unresolved', () => {
    expect(resolveReconcileOutcome(status({ openOverdueTitles: 1 }), false)).toBe('unresolved');
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
