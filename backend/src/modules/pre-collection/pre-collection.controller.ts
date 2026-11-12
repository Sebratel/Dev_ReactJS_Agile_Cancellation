import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { createApiResponse } from '@/common/responses/api-response';
import { PreCollectionService } from '@/modules/pre-collection/pre-collection.service';

@Controller('pre-collection')
export class PreCollectionController {
  constructor(private readonly service: PreCollectionService) {}

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT')
  @Get()
  list(@Query('daysWindow') daysWindow?: string) {
    return this.service.list(daysWindow);
  }

  // Cria casos de cobranca para clientes com 2a mensalidade a vencer em ate 5 dias
  // e os distribui automaticamente entre os atendentes de cobrança.
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('distribute')
  @HttpCode(200)
  async distribute() {
    const result = await this.service.distribute();
    return createApiResponse(result);
  }
}
