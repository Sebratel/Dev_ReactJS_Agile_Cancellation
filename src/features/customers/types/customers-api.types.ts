export type CustomerListItemResponse = {
  id: string;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  contractsCount: number;
  openInvoicesCount: number;
  totalOutstanding: string;
  overdueInvoicesCount: number;
  overdueAmount: string;
  notDueAmount: string;
};

export type CustomerContractSummary = {
  id: string;
  code: string;
  status: string;
  totalValue: string | null;
};

export type CustomerInvoiceSummary = {
  id: string;
  contractCode: string;
  invoiceNumber: string | null;
  status: string;
  dueDate: string;
  amount: string;
  paidAmount: string;
  isOverdue: boolean;
};

export type CustomerDetailsResponse = {
  id: string;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  contracts: CustomerContractSummary[];
  paymentHistory: CustomerInvoiceSummary[];
  totalOutstanding: string;
  openInvoicesCount: number;
  overdueInvoicesCount: number;
  overdueAmount: string;
  notDueAmount: string;
  createdAt: string;
};

export type CustomersSortBy =
  | 'name'
  | 'contractsCount'
  | 'openInvoicesCount'
  | 'overdueAmount'
  | 'totalOutstanding';

export type CustomersSortDirection = 'asc' | 'desc';

export type CustomersListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: CustomersSortBy;
  sortDirection?: CustomersSortDirection;
};
