import { isContractRegularized } from '@/modules/erp-sync/reconcile-classification';

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
