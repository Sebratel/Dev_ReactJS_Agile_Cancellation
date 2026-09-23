import {
  isContractRegularized,
  resolveRecoveredCaseIds,
} from '@/modules/erp-sync/reconcile-classification';

describe('isContractRegularized', () => {
  it('é pagamento quando status elegível e sem títulos vencidos', () => {
    expect(
      isContractRegularized({ erpContractStatus: 'Normal', openOverdueTitles: 0 }),
    ).toBe(true);
    expect(
      isContractRegularized({
        erpContractStatus: 'Bloqueio Financeiro',
        openOverdueTitles: 0,
      }),
    ).toBe(true);
  });

  it('NÃO é pagamento quando ainda há títulos vencidos em aberto', () => {
    expect(
      isContractRegularized({ erpContractStatus: 'Normal', openOverdueTitles: 2 }),
    ).toBe(false);
  });

  it('NÃO é pagamento quando o status não é elegível (cancelado)', () => {
    expect(
      isContractRegularized({
        erpContractStatus: 'Cancelado',
        openOverdueTitles: 0,
      }),
    ).toBe(false);
    expect(
      isContractRegularized({ erpContractStatus: null, openOverdueTitles: 0 }),
    ).toBe(false);
  });

  it('NÃO é pagamento quando o contrato não foi encontrado no ERP', () => {
    expect(isContractRegularized(undefined)).toBe(false);
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
