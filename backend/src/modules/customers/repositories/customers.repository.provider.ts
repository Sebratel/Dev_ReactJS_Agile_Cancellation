import type { Provider } from '@nestjs/common';
import { CUSTOMERS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { createCustomersRepository } from '@/modules/customers/repositories/customers.repository.factory';
import { CustomersMockRepository } from '@/modules/customers/repositories/customers-mock.repository';
import { CustomersPrismaRepository } from '@/modules/customers/repositories/customers-prisma.repository';

export const customersRepositoryProvider: Provider = {
  provide: CUSTOMERS_REPOSITORY,
  useFactory: createCustomersRepository,
  inject: [CustomersMockRepository, CustomersPrismaRepository],
};
