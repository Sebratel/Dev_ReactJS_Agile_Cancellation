import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { AssignCaseDto } from '@/modules/collection-cases/dto/assign-case.dto';
import { BulkAssignCasesDto } from '@/modules/collection-cases/dto/bulk-assign-cases.dto';
import { AutoDistributeDto } from '@/modules/collection-cases/dto/auto-distribute.dto';
import { CollectionCasesQueryDto } from '@/modules/collection-cases/dto/collection-cases-query.dto';
import { CreateCollectionAttemptDto } from '@/modules/collection-cases/dto/create-collection-attempt.dto';
import { CreatePaymentPromiseDto } from '@/modules/collection-cases/dto/create-payment-promise.dto';
import { SendToCancellationDto } from '@/modules/collection-cases/dto/send-to-cancellation.dto';
import { BulkSendToCancellationDto } from '@/modules/collection-cases/dto/bulk-send-to-cancellation.dto';
import { RevertCancellationDto } from '@/modules/collection-cases/dto/revert-cancellation.dto';
import { UpdatePaymentPromiseStatusDto } from '@/modules/collection-cases/dto/update-payment-promise-status.dto';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';
import { mapQueryDtoToListParams } from '@/modules/collection-cases/repositories/collection-cases.repository';
import { restrictToOwnCasesIfAgent } from '@/modules/collection-cases/utils/restrict-to-own-cases.util';

@Controller('collection-cases')
export class CollectionCasesController {
  constructor(
    private readonly collectionCasesService: CollectionCasesService,
  ) {}

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get()
  listCases(
    @Query() query: CollectionCasesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.listCases(
      restrictToOwnCasesIfAgent(mapQueryDtoToListParams(query), user),
    );
  }

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get('overdue-dates-summary')
  getOverdueDateSummary(
    @Query() query: CollectionCasesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.getOverdueDateSummary(
      restrictToOwnCasesIfAgent(mapQueryDtoToListParams(query), user),
    );
  }

  // Painel de carteiras da supervisao: resumo agregado por atendente.
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('portfolios')
  getPortfolios() {
    return this.collectionCasesService.getPortfolios();
  }

  // Contagem de casos por status (para o grafico de desfecho da supervisao).
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('status-summary')
  getStatusSummary() {
    return this.collectionCasesService.getStatusSummary();
  }

  // Quantos casos entraram hoje x ontem (createdAt) — acompanhamento diario do
  // inflow para conferir com o fluxo de automacao (N8N).
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('intake-summary')
  getIntakeSummary() {
    return this.collectionCasesService.getIntakeSummary();
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/attempts')
  createAttempt(
    @Param('id') id: string,
    @Body() body: CreateCollectionAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.createAttempt(id, body, user.id, user);
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/contact-whatsapp')
  contactCustomerByWhatsApp(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.contactCustomerByWhatsApp(
      id,
      user.id,
      user,
    );
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/promises')
  createPromise(
    @Param('id') id: string,
    @Body() body: CreatePaymentPromiseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.createPromise(id, body, user.id, user);
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/promises/:promiseId/fulfill')
  fulfillPromise(
    @Param('id') caseId: string,
    @Param('promiseId') promiseId: string,
    @Body() body: UpdatePaymentPromiseStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.fulfillPromise(
      caseId,
      promiseId,
      body,
      user.id,
      user,
    );
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/promises/:promiseId/break')
  breakPromise(
    @Param('id') caseId: string,
    @Param('promiseId') promiseId: string,
    @Body() body: UpdatePaymentPromiseStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.breakPromise(
      caseId,
      promiseId,
      body,
      user.id,
      user,
    );
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/promises/:promiseId/cancel')
  cancelPromise(
    @Param('id') caseId: string,
    @Param('promiseId') promiseId: string,
    @Body() body: UpdatePaymentPromiseStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.cancelPromise(
      caseId,
      promiseId,
      body,
      user.id,
      user,
    );
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Post('bulk-assign')
  bulkAssignCases(
    @Body() body: BulkAssignCasesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.bulkAssignCases(body, user.id);
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Post('auto-distribute')
  autoDistribute(
    @Body() body: AutoDistributeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.autoDistribute(body, user.id);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="casos-cobranca.csv"')
  exportCases(
    @Query() query: CollectionCasesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.exportCasesCsv(
      restrictToOwnCasesIfAgent(mapQueryDtoToListParams(query), user),
    );
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Patch(':id/assign')
  assignCase(
    @Param('id') id: string,
    @Body() body: AssignCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.assignCase(id, body, user.id);
  }

  @Roles('SUPERVISOR', 'ADMIN', 'COLLECTION_AGENT')
  @Post(':id/send-to-cancellation')
  sendToCancellation(
    @Param('id') caseId: string,
    @Body() body: SendToCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.sendToCancellation(caseId, body, user);
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Post('send-to-cancellation-bulk')
  bulkSendToCancellation(
    @Body() body: BulkSendToCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.bulkSendToCancellation(body, user);
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/recover-cancelled')
  recoverCancelled(
    @Param('id') caseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.recoverCancelled(caseId, user.id);
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN', 'CANCELLATION_AGENT')
  @Post(':id/revert-cancellation')
  revertCancellation(
    @Param('id') caseId: string,
    @Body() body: RevertCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.revertCancellation(
      caseId,
      body,
      user.id,
      user,
    );
  }

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get(':id/timeline')
  getCaseTimeline(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.getCaseTimeline(id, user);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get(':id')
  getCaseById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.collectionCasesService.getCaseById(id, user);
  }
}
