import { sumReceivableInvoices } from '@/modules/collection-cases/utils/receivable-invoices.util';

describe('sumReceivableInvoices', () => {
  it('soma so faturas a receber (sem canceladas nem pagas)', () => {
    const total = sumReceivableInvoices([
      { status: 'CANCELLED', amount: '99.90', paidAmount: '0' },
      { status: 'CANCELLED', amount: '99.90', paidAmount: '0' },
      { status: 'OVERDUE', amount: '99.90', paidAmount: '0' },
      { status: 'PAID', amount: '99.90', paidAmount: '99.90' },
      { status: 'OPEN', amount: '99.90', paidAmount: '0' },
    ]);

    expect(total).toBeCloseTo(199.8, 2);
  });

  it('fatura parcialmente paga conta so o que falta', () => {
    expect(
      sumReceivableInvoices([
        { status: 'PARTIALLY_PAID', amount: '100', paidAmount: '40' },
      ]),
    ).toBeCloseTo(60, 2);
  });

  it('nunca fica negativo e e zero sem faturas a receber', () => {
    expect(
      sumReceivableInvoices([
        { status: 'OVERDUE', amount: '50', paidAmount: '80' },
      ]),
    ).toBe(0);
    expect(sumReceivableInvoices([])).toBe(0);
  });
});
