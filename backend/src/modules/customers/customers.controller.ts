import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CustomersQueryDto } from '@/modules/customers/dto/customers-query.dto';
import { CustomersService } from '@/modules/customers/customers.service';

@Controller('customers')
@Roles('ADMIN', 'SUPERVISOR', 'FINANCE')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@Query() query: CustomersQueryDto) {
    return this.customersService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }
}
