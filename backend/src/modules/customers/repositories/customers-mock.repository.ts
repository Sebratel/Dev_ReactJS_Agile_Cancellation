import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type {
  CustomerDetailsResponse,
  CustomerInvoiceSummary,
  CustomerListItemResponse,
} from '@/modules/customers/dto/customer.response';
import {
  mockCustomers,
  type MockCustomer,
} from '@/modules/customers/mocks/customers.mock';
import {
  isOpenInvoiceStatus,
  isOverdueInvoice,
  type CustomersListParams,
  type CustomersRepository,
} from '@/modules/customers/repositories/customers.repository';
import type { CustomersSortBy } from '@/modules/customers/dto/customers-query.dto';

function compareBySortField(
  a: CustomerListItemResponse,
  b: CustomerListItemResponse,
  sortBy: Exclude<CustomersSortBy, 'name'>,
): number {
  switch (sortBy) {
    case 'contractsCount':
      return a.contractsCount - b.contractsCount;
    case 'openInvoicesCount':
      return a.openInvoicesCount - b.openInvoicesCount;
    case 'overdueAmount':
      return Number(a.overdueAmount) - Number(b.overdueAmount);
    case 'totalOutstanding':
      return Number(a.totalOutstanding) - Number(b.totalOutstanding);
    default:
      return 0;
  }
}

function computeAggregates(customer: MockCustomer) {
  let openInvoicesCount = 0;
  let totalOutstanding = 0;
  let overdueInvoicesCount = 0;
  let overdueAmount = 0;
  let notDueAmount = 0;

  for (const contract of customer.contracts) {
    for (const invoice of contract.invoices) {
      if (isOpenInvoiceStatus(invoice.status)) {
        openInvoicesCount += 1;
        const remaining = Math.max(invoice.amount - invoice.paidAmount, 0);
        totalOutstanding += remaining;

        if (isOverdueInvoice(invoice.status, new Date(invoice.dueDate))) {
          overdueInvoicesCount += 1;
          overdueAmount += remaining;
        } else {
          notDueAmount += remaining;
        }
      }
    }
  }

  return {
    openInvoicesCount,
    totalOutstanding,
    overdueInvoicesCount,
    overdueAmount,
    notDueAmount,
  };
}

@Injectable()
export class CustomersMockRepository implements CustomersRepository {
  listCustomers(params: CustomersListParams) {
    const search = params.search?.trim().toLowerCase();
    const sortBy = params.sortBy ?? 'name';
    const sortDirection = params.sortDirection ?? 'asc';

    const filtered = search
      ? mockCustomers.filter(
          (customer) =>
            customer.name.toLowerCase().includes(search) ||
            customer.document.toLowerCase().includes(search) ||
            (customer.email?.toLowerCase().includes(search) ?? false),
        )
      : mockCustomers;

    const mapped: CustomerListItemResponse[] = filtered.map((customer) => {
      const {
        openInvoicesCount,
        totalOutstanding,
        overdueInvoicesCount,
        overdueAmount,
        notDueAmount,
      } = computeAggregates(customer);

      return {
        id: customer.id,
        name: customer.name,
        document: customer.document,
        email: customer.email,
        phone: customer.phone,
        contractsCount: customer.contracts.length,
        openInvoicesCount,
        totalOutstanding: totalOutstanding.toFixed(2),
        overdueInvoicesCount,
        overdueAmount: overdueAmount.toFixed(2),
        notDueAmount: notDueAmount.toFixed(2),
      };
    });

    const sorted = mapped.sort((a, b) => {
      const diff =
        sortBy === 'name'
          ? a.name.localeCompare(b.name)
          : compareBySortField(a, b, sortBy);
      return sortDirection === 'asc' ? diff : -diff;
    });

    const start = (params.page - 1) * params.limit;
    const items = sorted.slice(start, start + params.limit);

    return Promise.resolve(
      createPaginatedResponse(items, params.page, params.limit, sorted.length),
    );
  }

  getCustomerById(id: string): Promise<CustomerDetailsResponse | null> {
    const customer = mockCustomers.find((item) => item.id === id);

    if (!customer) {
      return Promise.resolve(null);
    }

    const {
      openInvoicesCount,
      totalOutstanding,
      overdueInvoicesCount,
      overdueAmount,
      notDueAmount,
    } = computeAggregates(customer);

    const paymentHistory: CustomerInvoiceSummary[] = customer.contracts
      .flatMap((contract) =>
        contract.invoices.map((invoice) => ({
          id: invoice.id,
          contractCode: contract.code,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          dueDate: invoice.dueDate,
          amount: invoice.amount.toFixed(2),
          paidAmount: invoice.paidAmount.toFixed(2),
          isOverdue:
            isOpenInvoiceStatus(invoice.status) &&
            isOverdueInvoice(invoice.status, new Date(invoice.dueDate)),
        })),
      )
      .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));

    return Promise.resolve({
      id: customer.id,
      name: customer.name,
      document: customer.document,
      email: customer.email,
      phone: customer.phone,
      contracts: customer.contracts.map((contract) => ({
        id: contract.id,
        code: contract.code,
        status: contract.status,
        totalValue: contract.totalValue?.toFixed(2) ?? null,
      })),
      paymentHistory,
      totalOutstanding: totalOutstanding.toFixed(2),
      openInvoicesCount,
      overdueInvoicesCount,
      overdueAmount: overdueAmount.toFixed(2),
      notDueAmount: notDueAmount.toFixed(2),
      createdAt: customer.createdAt,
    });
  }
}
