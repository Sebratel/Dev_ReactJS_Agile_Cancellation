import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CUSTOMERS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import type { CustomersQueryDto } from '@/modules/customers/dto/customers-query.dto';
import type { CustomersRepository } from '@/modules/customers/repositories/customers.repository';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customersRepository: CustomersRepository,
  ) {}

  async list(query: CustomersQueryDto) {
    const paginated = await this.customersRepository.listCustomers({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });

    return createApiResponse(paginated);
  }

  async getById(id: string) {
    const customer = await this.customersRepository.getCustomerById(id);

    if (!customer) {
      throw new AppException(
        `Cliente ${id} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(customer);
  }
}
