export type MockCustomerInvoice = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
};

export type MockCustomerContract = {
  id: string;
  code: string;
  status: string;
  totalValue: number | null;
  invoices: MockCustomerInvoice[];
};

export type MockCustomer = {
  id: string;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  contracts: MockCustomerContract[];
};

export const mockCustomers: MockCustomer[] = [
  {
    id: 'cus_0001',
    name: 'Construtora Horizonte',
    document: '12.345.678/0001-90',
    email: 'financeiro@horizonte.com.br',
    phone: '+55 11 4002-8922',
    createdAt: '2024-08-12T00:00:00.000Z',
    contracts: [
      {
        id: 'ctr_0001',
        code: 'CTR-10428',
        status: 'ACTIVE',
        totalValue: 48000,
        invoices: [
          {
            id: 'inv_0001',
            invoiceNumber: 'NF-2025-001',
            status: 'OVERDUE',
            dueDate: '2025-04-10T00:00:00.000Z',
            amount: 12890.55,
            paidAmount: 0,
          },
          {
            id: 'inv_0002',
            invoiceNumber: 'NF-2025-002',
            status: 'PAID',
            dueDate: '2025-03-10T00:00:00.000Z',
            amount: 12000,
            paidAmount: 12000,
          },
        ],
      },
    ],
  },
  {
    id: 'cus_0002',
    name: 'Padaria Sao Jorge',
    document: '98.765.432/0001-10',
    email: 'contato@saojorge.com.br',
    phone: '+55 21 3555-1020',
    createdAt: '2024-11-03T00:00:00.000Z',
    contracts: [
      {
        id: 'ctr_0002',
        code: 'CTR-10555',
        status: 'ACTIVE',
        totalValue: 9600,
        invoices: [
          {
            id: 'inv_0003',
            invoiceNumber: 'NF-2025-010',
            status: 'PARTIALLY_PAID',
            dueDate: '2025-05-05T00:00:00.000Z',
            amount: 2400,
            paidAmount: 800,
          },
        ],
      },
    ],
  },
  {
    id: 'cus_0003',
    name: 'Studio Aurora Design',
    document: '11.222.333/0001-44',
    email: null,
    phone: '+55 31 98888-1234',
    createdAt: '2025-01-20T00:00:00.000Z',
    contracts: [
      {
        id: 'ctr_0003',
        code: 'CTR-10620',
        status: 'ACTIVE',
        totalValue: 3600,
        invoices: [
          {
            id: 'inv_0004',
            invoiceNumber: 'NF-2025-021',
            status: 'PAID',
            dueDate: '2025-02-15T00:00:00.000Z',
            amount: 1800,
            paidAmount: 1800,
          },
        ],
      },
    ],
  },
];
