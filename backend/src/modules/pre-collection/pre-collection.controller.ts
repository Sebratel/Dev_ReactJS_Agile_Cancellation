import { Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
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
  async distribute(@Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    const result = await this.service.distribute(user?.id ?? 'system');
    return createApiResponse(result);
  }
}
