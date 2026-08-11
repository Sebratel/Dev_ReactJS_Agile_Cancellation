import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { CustomersMockRepository } from '@/modules/customers/repositories/customers-mock.repository';
import type { CustomersPrismaRepository } from '@/modules/customers/repositories/customers-prisma.repository';
import type { CustomersRepository } from '@/modules/customers/repositories/customers.repository';

export function createCustomersRepository(
  mockRepository: CustomersMockRepository,
  prismaRepository: CustomersPrismaRepository,
): CustomersRepository {
  return getDataSourceMode() === 'database' ? prismaRepository : mockRepository;
}
