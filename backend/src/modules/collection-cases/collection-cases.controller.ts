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

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/attempts')
  createAttempt(
    @Param('id') id: string,
    @Body() body: CreateCollectionAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.createAttempt(id, body, user.id);
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/contact-whatsapp')
  contactCustomerByWhatsApp(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.contactCustomerByWhatsApp(id, user.id);
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
  @Post(':id/promises')
  createPromise(
    @Param('id') id: string,
    @Body() body: CreatePaymentPromiseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.createPromise(id, body, user.id);
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

  @Roles('SUPERVISOR', 'ADMIN')
  @Post(':id/send-to-cancellation')
  sendToCancellation(
    @Param('id') caseId: string,
    @Body() body: SendToCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionCasesService.sendToCancellation(
      caseId,
      body,
      user.id,
    );
  }

  @Roles('COLLECTION_AGENT', 'SUPERVISOR', 'ADMIN')
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
    );
  }

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get(':id/timeline')
  getCaseTimeline(@Param('id') id: string) {
    return this.collectionCasesService.getCaseTimeline(id);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get(':id')
  getCaseById(@Param('id') id: string) {
    return this.collectionCasesService.getCaseById(id);
  }
}
