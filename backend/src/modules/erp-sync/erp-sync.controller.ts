import { Controller, Get, Param } from '@nestjs/common';
import { createApiResponse } from '@/common/responses/api-response';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';

@Controller('erp')
export class ErpSyncController {
  constructor(private readonly erpSyncService: ErpSyncService) {}

  // Historico de renegociacoes (supervisao): clientes da carteira que
  // renegociaram alguma vez, com nº de vezes e datas (fonte financial_renegotiations).
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('renegotiation-history')
  async getRenegotiationHistory() {
    const history = await this.erpSyncService.getRenegotiationHistory();

    return createApiResponse(history);
  }

  // Detalhe de renegociacao de um contrato (supervisao): titulos renegociados
  // e saldo em aberto, buscados ao vivo no ERP.
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('renegotiation-detail/:externalId')
  async getRenegotiationDetail(@Param('externalId') externalId: string) {
    const detail =
      await this.erpSyncService.getRenegotiationDetail(externalId);

    return createApiResponse(detail);
  }
}
