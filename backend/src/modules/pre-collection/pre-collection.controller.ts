import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { PreCollectionService } from '@/modules/pre-collection/pre-collection.service';

@Controller('pre-collection')
export class PreCollectionController {
  constructor(private readonly service: PreCollectionService) {}

  // Clientes prestes a vencer a 2a mensalidade (visao preventiva, direto do ERP).
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT')
  @Get()
  list(@Query('daysWindow') daysWindow?: string) {
    return this.service.list(daysWindow);
  }
}
