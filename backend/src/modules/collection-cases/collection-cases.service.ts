import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { COLLECTION_CASES_REPOSITORY } from '@/common/data-source/data-source.constants';
import {
  assertCanActOnCase,
  isRestrictedToOwnCases,
} from '@/modules/collection-cases/utils/case-ownership.util';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import type { CreateCollectionAttemptDto } from '@/modules/collection-cases/dto/create-collection-attempt.dto';
import type { CreatePaymentPromiseDto } from '@/modules/collection-cases/dto/create-payment-promise.dto';
import type { UpdatePaymentPromiseStatusDto } from '@/modules/collection-cases/dto/update-payment-promise-status.dto';
import type { PaymentPromiseResponse } from '@/modules/collection-cases/dto/payment-promise.response';
import type { SendToCancellationDto } from '@/modules/collection-cases/dto/send-to-cancellation.dto';
import type { BulkSendToCancellationDto } from '@/modules/collection-cases/dto/bulk-send-to-cancellation.dto';
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
import { SettingsService } from '@/modules/settings/settings.service';

export type WhatsAppContactAttemptOutcome =
  | { outcome: 'case_not_found' }
  | { outcome: 'status_not_allowed'; status: string }
  | { outcome: 'no_phone' }
  | { outcome: 'failed'; error: Error }
  | {
      outcome: 'sent';
      result: {
        attemptId: string;
        provider: string;
        statusCode: number;
        codAtendimento: string | null;
        codMensagem: string | null;
        awaitingReply: boolean;
      };
    };

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

function formatPromiseAmount(amount: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(amount));
}

function getPromiseNotificationCopy(action: PaymentPromiseStatusAction) {
  if (action === 'FULFILLED') {
    return {
      type: 'PAYMENT_PROMISE_FULFILLED',
      title: 'Promessa cumprida',
      statusLabel: 'cumprida',
    };
  }

  if (action === 'BROKEN') {
    return {
      type: 'PAYMENT_PROMISE_BROKEN',
      title: 'Promessa descumprida',
      statusLabel: 'descumprida',
    };
  }

  return {
    type: 'PAYMENT_PROMISE_CANCELLED',
    title: 'Promessa cancelada',
    statusLabel: 'cancelada',
  };
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
  private readonly logger = new Logger(CollectionCasesService.name);

  constructor(
    @Inject(COLLECTION_CASES_REPOSITORY)
    private readonly collectionCasesRepository: CollectionCasesRepository,
    private readonly performedByResolver: PerformedByResolverService,
    private readonly matrixWhatsappContactService: MatrixWhatsappContactService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
  ) {}

  async listCases(params: CollectionCasesListParams) {
    const paginated = await this.collectionCasesRepository.listCases(params);

    return createApiResponse(paginated);
  }

  // Usado pelo envio de HSM em lote "por filtro" (whatsapp-bulk-contact) —
  // resolve o grupo customizado sem exigir selecao caso a caso.
  listCaseIds(params: CollectionCasesListParams): Promise<string[]> {
    return this.collectionCasesRepository.listCaseIds(params);
  }

  async getOverdueDateSummary(params: CollectionCasesListParams) {
    const summary =
      await this.collectionCasesRepository.getOverdueDateSummary(params);

    return createApiResponse(summary);
  }

  async getPortfolios() {
    const portfolios = await this.collectionCasesRepository.getPortfolios();

    return createApiResponse(portfolios);
  }

  async getStatusSummary() {
    const byStatus = await this.collectionCasesRepository.getStatusSummary();

    return createApiResponse({ byStatus });
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
    actor?: AuthenticatedUser,
  ) {
    await this.assertActorOwnsCase(caseId, actor);

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

  async contactCustomerByWhatsApp(
    caseId: string,
    performedByUserId: string,
    actor?: AuthenticatedUser,
  ) {
    await this.assertActorOwnsCase(caseId, actor);

    const outcome = await this.attemptWhatsAppContact(
      caseId,
      performedByUserId,
    );

    if (outcome.outcome === 'case_not_found') {
      throw new AppException(
        `Caso de cobranÃ§a ${caseId} nÃ£o encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (outcome.outcome === 'status_not_allowed') {
      throw new AppException(
        `Caso de cobranÃ§a ${caseId} nÃ£o permite contato a partir do status ${outcome.status}.`,
        HttpStatus.CONFLICT,
      );
    }

    if (outcome.outcome === 'no_phone') {
      throw new AppException(
        'Cliente sem telefone valido para contato via WhatsApp.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (outcome.outcome === 'failed') {
      throw outcome.error;
    }

    return createApiResponse(outcome.result);
  }

  // Nucleo compartilhado entre o envio individual (acima) e o envio em lote
  // (WhatsappBulkContactWorkerService, no modulo whatsapp-bulk-contact) — ao
  // inves de lancar excecao no primeiro caso invalido/com falha (o que faria
  // sentido para um unico caso, mas interromperia um lote inteiro), retorna
  // um resultado tipado para cada situacao, e quem chama decide o que fazer.
  async attemptWhatsAppContact(
    caseId: string,
    performedByUserId: string,
  ): Promise<WhatsAppContactAttemptOutcome> {
    const resolvedPerformerId =
      this.performedByResolver.resolve(performedByUserId);
    const context =
      await this.collectionCasesRepository.getContactContext(caseId);

    if (!context) {
      return { outcome: 'case_not_found' };
    }

    if (!CONTACT_ALLOWED_STATUSES.has(context.status)) {
      return { outcome: 'status_not_allowed', status: context.status };
    }

    if (!hasUsablePhone(context.customer.phone)) {
      return { outcome: 'no_phone' };
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

      return {
        outcome: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      };
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
          codAtendimento: providerResult.codAtendimento,
          codMensagem: providerResult.codMensagem,
          responseBody: providerResult.responseBody,
        },
        matrixAttendanceCode: providerResult.codAtendimento,
        matrixMessageCode: providerResult.codMensagem,
      });

    return {
      outcome: 'sent',
      result: {
        attemptId: recorded.attemptId,
        provider: providerResult.provider,
        statusCode: providerResult.statusCode,
        codAtendimento: recorded.matrixAttendanceCode,
        codMensagem: recorded.matrixMessageCode,
        awaitingReply: Boolean(recorded.matrixAttendanceCode),
      },
    };
  }

  async createPromise(
    caseId: string,
    dto: CreatePaymentPromiseDto,
    performedByUserId: string,
    actor?: AuthenticatedUser,
  ) {
    await this.assertActorOwnsCase(caseId, actor);

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
    actor?: AuthenticatedUser,
  ) {
    return this.handlePromiseStatusUpdate(
      caseId,
      promiseId,
      'FULFILLED',
      dto,
      performedByUserId,
      actor,
    );
  }

  async breakPromise(
    caseId: string,
    promiseId: string,
    dto: UpdatePaymentPromiseStatusDto,
    performedByUserId: string,
    actor?: AuthenticatedUser,
  ) {
    return this.handlePromiseStatusUpdate(
      caseId,
      promiseId,
      'BROKEN',
      dto,
      performedByUserId,
      actor,
    );
  }

  async cancelPromise(
    caseId: string,
    promiseId: string,
    dto: UpdatePaymentPromiseStatusDto,
    performedByUserId: string,
    actor?: AuthenticatedUser,
  ) {
    return this.handlePromiseStatusUpdate(
      caseId,
      promiseId,
      'CANCELLED',
      dto,
      performedByUserId,
      actor,
    );
  }

  private async handlePromiseStatusUpdate(
    caseId: string,
    promiseId: string,
    action: PaymentPromiseStatusAction,
    dto: UpdatePaymentPromiseStatusDto,
    performedByUserId: string,
    actor?: AuthenticatedUser,
  ) {
    await this.assertActorOwnsCase(caseId, actor);

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

    await this.notifySupervisorsAboutPromiseStatus(action, result.promise);

    return createApiResponse(result.promise);
  }

  private async notifySupervisorsAboutPromiseStatus(
    action: PaymentPromiseStatusAction,
    promise: PaymentPromiseResponse,
  ) {
    const details = await this.collectionCasesRepository.getCaseById(
      promise.collectionCaseId,
    );
    const copy = getPromiseNotificationCopy(action);
    const customerName = details?.customer.name ?? 'Cliente';
    const contractCode = details?.contract.code ?? 'contrato nao informado';
    const assignedTo = details?.assignedTo?.name
      ? ` Responsavel: ${details.assignedTo.name}.`
      : '';

    try {
      await this.notificationsService.notifySupervisors({
        type: copy.type,
        title: `${copy.title}: ${customerName}`,
        body: `Promessa ${copy.statusLabel} no valor de ${formatPromiseAmount(
          promise.promisedAmount,
        )} para o contrato ${contractCode}.${assignedTo}`,
        entityType: 'collection_case',
        entityId: promise.collectionCaseId,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar supervisao sobre promessa ${promise.id}: ${getErrorMessage(
          error,
        )}`,
      );
    }
  }

  async sendToCancellation(
    caseId: string,
    dto: SendToCancellationDto,
    performer: AuthenticatedUser,
  ) {
    await this.assertCanSendToCancellation(performer);
    await this.assertActorOwnsCase(caseId, performer);

    const resolvedPerformerId = this.performedByResolver.resolve(performer.id);
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

  async bulkSendToCancellation(
    dto: BulkSendToCancellationDto,
    performer: AuthenticatedUser,
  ) {
    await this.assertCanSendToCancellation(performer);

    const resolvedPerformerId = this.performedByResolver.resolve(performer.id);
    const uniqueCaseIds = Array.from(new Set(dto.caseIds));

    let sent = 0;
    const skipped: Array<{ caseId: string; reason: string }> = [];

    // Cada caso é encaminhado na sua própria transação (o repositório já é
    // transacional por caso). Falha em um não derruba os demais — reportamos o
    // resumo para a supervisão saber o que entrou e o que foi ignorado.
    for (const caseId of uniqueCaseIds) {
      const result = await this.collectionCasesRepository.sendToCancellation({
        caseId,
        input: {
          reason: dto.reason,
          notes: dto.notes,
          assignedUserId: dto.assignedUserId,
        },
        performedByUserId: resolvedPerformerId,
      });

      if (result.outcome === 'success') {
        sent += 1;
      } else {
        skipped.push({ caseId, reason: result.outcome });
      }
    }

    return createApiResponse({
      requested: uniqueCaseIds.length,
      sent,
      skipped,
    });
  }

  async revertCancellation(
    caseId: string,
    dto: RevertCancellationDto,
    performedByUserId: string,
    actor?: AuthenticatedUser,
  ) {
    await this.assertActorOwnsCase(caseId, actor);

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

  // Escrita so em caso atribuido ao proprio atendente (ADMIN/SUPERVISOR agem em
  // qualquer caso). Sem `actor` (chamadas internas, ex.: worker de envio em
  // lote iniciado pela supervisao) nao ha checagem.
  private async assertActorOwnsCase(
    caseId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor || !isRestrictedToOwnCases(actor)) {
      return;
    }

    const details = await this.collectionCasesRepository.getCaseById(caseId);

    if (!details) {
      throw new AppException(
        `Caso de cobrança ${caseId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    assertCanActOnCase(actor, details.assignedTo?.id ?? null);
  }

  // SUPERVISOR/ADMIN sempre podem encaminhar. Atendente (COLLECTION_AGENT) só
  // quando o administrador libera a chave global `allowAgentSendToCancellation`.
  private async assertCanSendToCancellation(performer: AuthenticatedUser) {
    const isPrivileged = performer.roles.some(
      (role) => role === 'ADMIN' || role === 'SUPERVISOR',
    );

    if (isPrivileged) {
      return;
    }

    const isAgent = performer.roles.includes('COLLECTION_AGENT');
    const agentAllowed =
      await this.settingsService.isAgentSendToCancellationAllowed();

    if (isAgent && agentAllowed) {
      return;
    }

    throw new AppException(
      'Seu perfil não tem permissão para encaminhar casos ao cancelamento.',
      HttpStatus.FORBIDDEN,
    );
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

    if (result.outcome === 'assignee_invalid') {
      throw new AppException(
        'Selecione um agente de cancelamento ativo para receber o caso.',
        HttpStatus.UNPROCESSABLE_ENTITY,
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
