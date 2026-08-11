import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import { formatDecimal } from '@/common/utils/decimal.util';
import { PrismaService } from '@/database/prisma/prisma.service';
import type {
  CustomerDetailsResponse,
  CustomerInvoiceSummary,
  CustomerListItemResponse,
} from '@/modules/customers/dto/customer.response';
import {
  isOpenInvoiceStatus,
  isOverdueInvoice,
  type CustomersListParams,
  type CustomersRepository,
} from '@/modules/customers/repositories/customers.repository';
import type { CustomersSortBy } from '@/modules/customers/dto/customers-query.dto';

const customerDetailInclude = {
  contracts: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      invoices: { orderBy: { dueDate: 'desc' as const } },
    },
  },
} satisfies Prisma.CustomerInclude;

type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: typeof customerDetailInclude;
}>;

@Injectable()
export class CustomersPrismaRepository implements CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(params: CustomersListParams) {
    const where: Prisma.CustomerWhereInput = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { document: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }

    const sortBy = params.sortBy ?? 'name';
    const sortDirection = params.sortDirection ?? 'asc';

    // Ordenacao por nome usa o banco (indice, paginacao eficiente). Os demais
    // campos sao agregados a partir das faturas em memoria, entao exigem
    // carregar todos os registros do filtro antes de ordenar e paginar.
    if (sortBy === 'name') {
      const skip = (params.page - 1) * params.limit;

      const [records, total] = await this.prisma.$transaction([
        this.prisma.customer.findMany({
          where,
          include: customerDetailInclude,
          orderBy: { name: sortDirection },
          skip,
          take: params.limit,
        }),
        this.prisma.customer.count({ where }),
      ]);

      const items = records.map((record) => this.mapListItem(record));

      return createPaginatedResponse(items, params.page, params.limit, total);
    }

    const records = await this.prisma.customer.findMany({
      where,
      include: customerDetailInclude,
      orderBy: { name: 'asc' },
    });

    const items = records
      .map((record) => this.mapListItem(record))
      .sort((a, b) => {
        const diff = this.compareBySortField(a, b, sortBy);
        return sortDirection === 'asc' ? diff : -diff;
      });

    const total = items.length;
    const start = (params.page - 1) * params.limit;
    const paged = items.slice(start, start + params.limit);

    return createPaginatedResponse(paged, params.page, params.limit, total);
  }

  private mapListItem(record: CustomerWithRelations): CustomerListItemResponse {
    const {
      openInvoicesCount,
      totalOutstanding,
      overdueInvoicesCount,
      overdueAmount,
      notDueAmount,
    } = this.computeAggregates(record);

    return {
      id: record.id,
      name: record.name,
      document: record.document,
      email: record.email,
      phone: record.phone,
      contractsCount: record.contracts.length,
      openInvoicesCount,
      totalOutstanding: totalOutstanding.toFixed(2),
      overdueInvoicesCount,
      overdueAmount: overdueAmount.toFixed(2),
      notDueAmount: notDueAmount.toFixed(2),
    };
  }

  private compareBySortField(
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

  async getCustomerById(id: string): Promise<CustomerDetailsResponse | null> {
    const record = await this.prisma.customer.findUnique({
      where: { id },
      include: customerDetailInclude,
    });

    if (!record) {
      return null;
    }

    const {
      openInvoicesCount,
      totalOutstanding,
      overdueInvoicesCount,
      overdueAmount,
      notDueAmount,
    } = this.computeAggregates(record);

    const paymentHistory: CustomerInvoiceSummary[] = record.contracts
      .flatMap((contract) =>
        contract.invoices.map((invoice) => ({
          id: invoice.id,
          contractCode: contract.code,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          dueDate: invoice.dueDate.toISOString(),
          amount: formatDecimal(invoice.amount),
          paidAmount: formatDecimal(invoice.paidAmount),
          isOverdue:
            isOpenInvoiceStatus(invoice.status) &&
            isOverdueInvoice(invoice.status, invoice.dueDate),
        })),
      )
      .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));

    return {
      id: record.id,
      name: record.name,
      document: record.document,
      email: record.email,
      phone: record.phone,
      contracts: record.contracts.map((contract) => ({
        id: contract.id,
        code: contract.code,
        status: contract.status,
        totalValue:
          contract.totalValue != null
            ? formatDecimal(contract.totalValue)
            : null,
      })),
      paymentHistory,
      totalOutstanding: totalOutstanding.toFixed(2),
      openInvoicesCount,
      overdueInvoicesCount,
      overdueAmount: overdueAmount.toFixed(2),
      notDueAmount: notDueAmount.toFixed(2),
      createdAt: record.createdAt.toISOString(),
    };
  }

  private computeAggregates(record: CustomerWithRelations) {
    let openInvoicesCount = 0;
    let totalOutstanding = 0;
    let overdueInvoicesCount = 0;
    let overdueAmount = 0;
    let notDueAmount = 0;

    for (const contract of record.contracts) {
      for (const invoice of contract.invoices) {
        if (isOpenInvoiceStatus(invoice.status)) {
          openInvoicesCount += 1;
          const amount = Number(formatDecimal(invoice.amount));
          const paidAmount = Number(formatDecimal(invoice.paidAmount));
          const remaining = Math.max(amount - paidAmount, 0);
          totalOutstanding += remaining;

          if (isOverdueInvoice(invoice.status, invoice.dueDate)) {
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
}
