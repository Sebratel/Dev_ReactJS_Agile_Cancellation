import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { COLLECTION_CASES_REPOSITORY } from '@/common/data-source/data-source.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import type { CreateCollectionAttemptDto } from '@/modules/collection-cases/dto/create-collection-attempt.dto';
import type { CreatePaymentPromiseDto } from '@/modules/collection-cases/dto/create-payment-promise.dto';
import type { UpdatePaymentPromiseStatusDto } from '@/modules/collection-cases/dto/update-payment-promise-status.dto';
import type { SendToCancellationDto } from '@/modules/collection-cases/dto/send-to-cancellation.dto';
import type { RevertCancellationDto } from '@/modules/collection-cases/dto/revert-cancellation.dto';
import type { AssignCaseDto } from '@/modules/collection-cases/dto/assign-case.dto';
import type { BulkAssignCasesDto } from '@/modules/collection-cases/dto/bulk-assign-cases.dto';
import type { AutoDistributeDto } from '@/modules/collection-cases/dto/auto-distribute.dto';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import type {
  CollectionCasesListParams,
  CollectionCasesRepository,
  PaymentPromiseStatusAction,
  RevertCancellationResult,
  SendToCancellationResult,
  UpdatePaymentPromiseStatusResult,
} from '@/modules/collection-cases/repositories/collection-cases.repository';
import { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';
import { MatrixWhatsappContactService } from '@/modules/collection-cases/services/matrix-whatsapp-contact.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';

const CONTACT_ALLOWED_STATUSES = new Set([
  'WAITING_TRIAGE',
  'IN_COLLECTION',
  'AWAITING_PAYMENT',
  'NO_RESPONSE',
  'ELIGIBLE_FOR_CANCELLATION',
  'CANCELLATION_IN_PROGRESS',
]);

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'cliente';
}

function hasUsablePhone(phone: string | null) {
  return Boolean(phone && phone.replace(/\D/g, '').length >= 10);
}

function getErrorMessage(error: unknown) {
  if (error instanceof AppException) {
    return error.message;
  }

  return error instanceof Error ? error.message : String(error);
}

function canAccessCaseDetails(
  user: AuthenticatedUser | undefined,
  assignedToId: string | null,
) {
  if (!user) return true;
  if (user.roles.some((role) => role === 'ADMIN' || role === 'SUPERVISOR')) {
    return true;
  }

  return assignedToId === user.id;
}

@Injectable()
export class CollectionCasesService {
  constructor(
    @Inject(COLLECTION_CASES_REPOSITORY)
    private readonly collectionCasesRepository: CollectionCasesRepository,
    private readonly performedByResolver: PerformedByResolverService,
    private readonly matrixWhatsappContactService: MatrixWhatsappContactService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listCases(params: CollectionCasesListParams) {
    const paginated = await this.collectionCasesRepository.listCases(params);

    return createApiResponse(paginated);
  }

  async getCaseById(id: string, user?: AuthenticatedUser) {
    const details = await this.collectionCasesRepository.getCaseById(id);

    if (
      !details ||
      !canAccessCaseDetails(user, details.assignedTo?.id ?? null)
    ) {
      throw new AppException(
        `Caso de cobrança ${id} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(details);
  }

  async getCaseTimeline(id: string, user?: AuthenticatedUser) {
    await this.getCaseById(id, user);

    const timeline = await this.collectionCasesRepository.getCaseTimeline(id);

    if (!timeline) {
      throw new AppException(
        `Caso de cobrança ${id} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(timeline);
  }

  async createAttempt(
    caseId: string,
    dto: CreateCollectionAttemptDto,
    performedByUserId: string,
  ) {
    const resolvedPerformerId =
      this.performedByResolver.resolve(performedByUserId);
    const attempt = await this.collectionCasesRepository.createAttempt({
      caseId,
      input: dto,
      performedByUserId: resolvedPerformerId,
    });

    if (!attempt) {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(attempt);
  }

  async contactCustomerByWhatsApp(caseId: string, performedByUserId: string) {
    const resolvedPerformerId =
      this.performedByResolver.resolve(performedByUserId);
    const context =
      await this.collectionCasesRepository.getContactContext(caseId);

    if (!context) {
      throw new AppException(
        `Caso de cobranÃ§a ${caseId} nÃ£o encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!CONTACT_ALLOWED_STATUSES.has(context.status)) {
      throw new AppException(
        `Caso de cobranÃ§a ${caseId} nÃ£o permite contato a partir do status ${context.status}.`,
        HttpStatus.CONFLICT,
      );
    }

    if (!hasUsablePhone(context.customer.phone)) {
      throw new AppException(
        'Cliente sem telefone valido para contato via WhatsApp.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const payload = {
      caseId: context.id,
      cliente: context.customer.name,
      nomeCurtoCliente: firstName(context.customer.name),
      contrato: context.contract.code,
      telefone: context.customer.phone!,
    };

    let providerResult;

    try {
      providerResult = await this.matrixWhatsappContactService.sendHsm(payload);
    } catch (error) {
      await this.collectionCasesRepository.recordWhatsAppContactIntegration({
        caseId,
        performedByUserId: resolvedPerformerId,
        status: 'FAILED',
        payload: {
          provider: 'n8n',
          caseId: payload.caseId,
          contrato: payload.contrato,
          telefone: payload.telefone,
        },
        errorMessage: getErrorMessage(error),
      });

      throw error;
    }

    const recorded =
      await this.collectionCasesRepository.recordWhatsAppContactIntegration({
        caseId,
        performedByUserId: resolvedPerformerId,
        status: 'COMPLETED',
        payload: {
          provider: providerResult.provider,
          statusCode: providerResult.statusCode,
          caseId: payload.caseId,
          contrato: payload.contrato,
          telefone: payload.telefone,
          responseBody: providerResult.responseBody,
        },
      });

    return createApiResponse({
      attemptId: recorded.attemptId,
      provider: providerResult.provider,
      statusCode: providerResult.statusCode,
    });
  }

  async createPromise(
    caseId: string,
    dto: CreatePaymentPromiseDto,
    performedByUserId: string,
  ) {
    const createdByUserId = this.performedByResolver.resolve(performedByUserId);
    const promise = await this.collectionCasesRepository.createPromise({
      caseId,
      input: dto,
      createdByUserId,
    });

    if (!promise) {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(promise);
  }

  async fulfillPromise(
    caseId: string,
    promiseId: string,
    dto: UpdatePaymentPromiseStatusDto,
    performedByUserId: string,
  ) {
    return this.handlePromiseStatusUpdate(
      caseId,
      promiseId,
      'FULFILLED',
      dto,
      performedByUserId,
    );
  }

  async breakPromise(
    caseId: string,
    promiseId: string,
    dto: UpdatePaymentPromiseStatusDto,
    performedByUserId: string,
  ) {
    return this.handlePromiseStatusUpdate(
      caseId,
      promiseId,
      'BROKEN',
      dto,
      performedByUserId,
    );
  }

  async cancelPromise(
    caseId: string,
    promiseId: string,
    dto: UpdatePaymentPromiseStatusDto,
    performedByUserId: string,
  ) {
    return this.handlePromiseStatusUpdate(
      caseId,
      promiseId,
      'CANCELLED',
      dto,
      performedByUserId,
    );
  }

  private async handlePromiseStatusUpdate(
    caseId: string,
    promiseId: string,
    action: PaymentPromiseStatusAction,
    dto: UpdatePaymentPromiseStatusDto,
    performedByUserId: string,
  ) {
    const resolvedPerformerId =
      this.performedByResolver.resolve(performedByUserId);
    const result = await this.collectionCasesRepository.updatePromiseStatus({
      caseId,
      promiseId,
      action,
      input: dto,
      performedByUserId: resolvedPerformerId,
    });

    this.assertPromiseStatusUpdateResult(result, caseId, promiseId);

    if (result.outcome !== 'success') {
      throw new AppException(
        'Falha ao atualizar promessa de pagamento.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return createApiResponse(result.promise);
  }

  async sendToCancellation(
    caseId: string,
    dto: SendToCancellationDto,
    performedByUserId: string,
  ) {
    const resolvedPerformerId =
      this.performedByResolver.resolve(performedByUserId);
    const result = await this.collectionCasesRepository.sendToCancellation({
      caseId,
      input: dto,
      performedByUserId: resolvedPerformerId,
    });

    this.assertSendToCancellationResult(result, caseId);

    if (result.outcome !== 'success') {
      throw new AppException(
        'Falha ao encaminhar caso para cancelamento.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return createApiResponse(result.cancellationProcess);
  }

  async revertCancellation(
    caseId: string,
    dto: RevertCancellationDto,
    performedByUserId: string,
  ) {
    const resolvedPerformerId =
      this.performedByResolver.resolve(performedByUserId);
    const result = await this.collectionCasesRepository.revertCancellation({
      caseId,
      input: dto,
      performedByUserId: resolvedPerformerId,
    });

    this.assertRevertCancellationResult(result, caseId);

    if (result.outcome !== 'success') {
      throw new AppException(
        'Falha ao reverter o cancelamento do caso.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return createApiResponse(result.case);
  }

  async assignCase(
    caseId: string,
    dto: AssignCaseDto,
    performedByUserId: string,
  ) {
    const resolvedPerformerId =
      this.performedByResolver.resolve(performedByUserId);
    const result = await this.collectionCasesRepository.assignCase({
      caseId,
      assignedUserId: dto.assignedUserId ?? null,
      performedByUserId: resolvedPerformerId,
    });

    if (result.outcome === 'case_not_found') {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'user_not_found') {
      throw new AppException(
        'Usuario responsavel nao encontrado, inativo ou sem perfil operacional.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (dto.assignedUserId) {
      await this.notificationsService.notify({
        userId: dto.assignedUserId,
        type: 'CASE_ASSIGNED',
        title: 'Novo caso atribuido a voce',
        body: `O caso de ${result.case.customer.name} foi atribuido a voce.`,
        entityType: 'collection_case',
        entityId: caseId,
      });
    }

    return createApiResponse(result.case);
  }

  async bulkAssignCases(dto: BulkAssignCasesDto, performedByUserId: string) {
    const resolvedPerformerId = this.performedByResolver.resolve(performedByUserId);
    const result = await this.collectionCasesRepository.bulkAssignCases({
      caseIds: dto.caseIds,
      assignedUserId: dto.assignedUserId ?? null,
      performedByUserId: resolvedPerformerId,
    });

    if (dto.assignedUserId && result.assigned > 0) {
      await this.notificationsService.notify({
        userId: dto.assignedUserId,
        type: 'CASES_BULK_ASSIGNED',
        title: 'Novos casos atribuidos a voce',
        body: `${result.assigned} ${result.assigned === 1 ? 'caso foi atribuido' : 'casos foram atribuidos'} a voce.`,
        entityType: 'collection_case',
      });
    }

    return createApiResponse(result);
  }

  async autoDistribute(dto: AutoDistributeDto, performedByUserId: string) {
    const resolvedPerformerId = this.performedByResolver.resolve(performedByUserId);
    const result = await this.collectionCasesRepository.autoDistributeCases({
      statuses: dto.statuses,
      targetRole: dto.targetRole,
      performedByUserId: resolvedPerformerId,
    });

    if (result.agents === 0 && result.distributed === 0) {
      throw new AppException(
        'Nenhum agente ativo ou caso elegível encontrado para distribuição.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return createApiResponse(result);
  }

  private assertSendToCancellationResult(
    result: SendToCancellationResult,
    caseId: string,
  ) {
    if (result.outcome === 'case_not_found') {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'already_in_cancellation') {
      throw new AppException(
        `Caso de cobrança ${caseId} já possui processo de cancelamento ativo.`,
        HttpStatus.CONFLICT,
      );
    }

    if (result.outcome === 'status_not_allowed') {
      throw new AppException(
        `Caso de cobrança ${caseId} não pode ser encaminhado para cancelamento a partir do status ${result.currentStatus}.`,
        HttpStatus.CONFLICT,
      );
    }
  }

  private assertRevertCancellationResult(
    result: RevertCancellationResult,
    caseId: string,
  ) {
    if (result.outcome === 'case_not_found') {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'status_not_allowed') {
      throw new AppException(
        `Caso de cobrança ${caseId} não pode ser revertido para recuperado a partir do status ${result.currentStatus}.`,
        HttpStatus.CONFLICT,
      );
    }
  }

  async exportCasesCsv(params: CollectionCasesListParams): Promise<string> {
    const result = await this.collectionCasesRepository.listCases({
      ...params,
      page: 1,
      limit: 5000,
    });

    const headers = [
      'ID',
      'Cliente',
      'Contrato',
      'Status',
      'Prioridade',
      'Dias em atraso',
      'Valor em aberto',
      'Responsavel',
      'SLA',
    ];

    const escape = (v: string | number | null | undefined): string => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const rows = result.items.map((c) =>
      [
        c.id,
        c.customerName,
        c.contractCode,
        c.status,
        c.priority,
        c.daysOverdue,
        c.outstandingAmount,
        c.assignedTo?.name ?? '',
        c.slaDueAt ?? '',
      ]
        .map(escape)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private assertPromiseStatusUpdateResult(
    result: UpdatePaymentPromiseStatusResult,
    caseId: string,
    promiseId: string,
  ) {
    if (result.outcome === 'case_not_found') {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'promise_not_found') {
      throw new AppException(
        `Promessa ${promiseId} não encontrada para o caso ${caseId}.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.outcome === 'invalid_transition') {
      throw new AppException(
        `Promessa ${promiseId} não pode ser alterada a partir do status ${result.currentStatus}.`,
        HttpStatus.CONFLICT,
      );
    }
  }
}
