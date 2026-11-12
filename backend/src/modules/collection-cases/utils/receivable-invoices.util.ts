import { InvoiceStatus } from '@prisma/client';

// Faturas que ainda são dinheiro a receber. Canceladas (inclusive as sintéticas
// da pré-cobrança, trocadas pela fatura real) e pagas não são dívida.
const RECEIVABLE_STATUSES: string[] = [
  InvoiceStatus.OPEN,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.PARTIALLY_PAID,
];

type InvoiceAmounts = {
  status: string;
  amount: number | string;
  paidAmount: number | string;
};

// "Total consolidado" do caso: soma do que falta pagar nas faturas a receber
// do contrato (valor menos pago, nunca negativo), sem canceladas nem pagas.
export function sumReceivableInvoices(invoices: InvoiceAmounts[]): number {
  return invoices
    .filter((invoice) => RECEIVABLE_STATUSES.includes(invoice.status))
    .reduce(
      (total, invoice) =>
        total +
        Math.max(Number(invoice.amount) - Number(invoice.paidAmount), 0),
      0,
    );
}
