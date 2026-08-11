import { Module } from '@nestjs/common';
import { CustomersController } from '@/modules/customers/customers.controller';
import { CustomersService } from '@/modules/customers/customers.service';
import { CustomersMockRepository } from '@/modules/customers/repositories/customers-mock.repository';
import { CustomersPrismaRepository } from '@/modules/customers/repositories/customers-prisma.repository';
import { customersRepositoryProvider } from '@/modules/customers/repositories/customers.repository.provider';

@Module({
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomersMockRepository,
    CustomersPrismaRepository,
    customersRepositoryProvider,
  ],
})
export class CustomersModule {}
