import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { ManualCreditDto } from '@/modules/erp-sync/dto/manual-credit.dto';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { DashboardRankingQueryDto } from '@/modules/dashboard/dto/dashboard-ranking-query.dto';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';

@Controller('erp')
export class ErpSyncController {
  constructor(private readonly erpSyncService: ErpSyncService) {}

  // Historico de renegociacoes (supervisao): clientes da carteira que
  // renegociaram alguma vez, com nº de vezes e datas (fonte financial_renegotiations).
  // Card "Renegociados em aberto" da visao geral (cacheado; available=false
  // quando o ERP nao responde).
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('renegotiation-summary')
  async getRenegotiationSummary() {
    const summary = await this.erpSyncService.getRenegotiationSummary();

    return createApiResponse(summary);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get('renegotiation-history')
  async getRenegotiationHistory() {
    const history = await this.erpSyncService.getRenegotiationHistory();

    return createApiResponse(history);
  }

  // Conferência do ranking: como cada recuperação de um atendente chegou ao
  // valor creditado (pagamento no ERP, contatos e verificações).
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('recovery-audit/:userId')
  async getRecoveryAudit(
    @Param('userId') userId: string,
    @Query() query: DashboardRankingQueryDto,
  ) {
    const audit = await this.erpSyncService.getRecoveryAudit(
      userId,
      query.period ?? 'current_month',
    );

    return createApiResponse(audit);
  }

  // Conferência de um caso recuperado (página de detalhe do caso).
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('case-recovery-audit/:caseId')
  async getCaseRecoveryAudit(@Param('caseId') caseId: string) {
    const result = await this.erpSyncService.getCaseRecoveryAudit(caseId);

    return createApiResponse(result);
  }

  // Crédito manual: a supervisão atribui a um atendente a receita de um cliente
  // que pagou sem contato registrado (caso "Pagamento realizado").
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('manual-credit/:caseId')
  async creditCaseManually(
    @Param('caseId') caseId: string,
    @Body() body: ManualCreditDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.erpSyncService.creditCaseManually(
      caseId,
      body,
      user.id,
    );

    if (result.outcome === 'case_not_found') {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'status_not_allowed') {
      throw new AppException(
        'Só é possível creditar casos com pagamento realizado e ainda sem crédito.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (result.outcome === 'user_not_found') {
      throw new AppException(
        'Atendente de cobrança não encontrado ou inativo.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (result.outcome === 'amount_unavailable') {
      throw new AppException(
        'Não foi possível confirmar o valor pago no ERP agora. Tente novamente em instantes.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return createApiResponse({ credited: true, amount: result.amount });
  }

  // Detalhe de renegociacao de um contrato (supervisao): titulos renegociados
  // e saldo em aberto, buscados ao vivo no ERP.
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('renegotiation-detail/:externalId')
  async getRenegotiationDetail(@Param('externalId') externalId: string) {
    const detail = await this.erpSyncService.getRenegotiationDetail(externalId);

    return createApiResponse(detail);
  }
}
