import { HttpStatus } from '@nestjs/common';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';
import type { CollectionCasesRepository } from '@/modules/collection-cases/repositories/collection-cases.repository';
import { mockCollectionCaseDetails } from '@/modules/collection-cases/mocks/collection-cases.mock';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';
import type { MatrixWhatsappContactService } from '@/modules/collection-cases/services/matrix-whatsapp-contact.service';
import type { NotificationsService } from '@/modules/notifications/notifications.service';
import type { SettingsService } from '@/modules/settings/settings.service';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';

function createService(repository: CollectionCasesRepository) {
  const resolvePerformedBy = jest.fn().mockReturnValue('usr_marina');
  const performedByResolver = {
    resolve: resolvePerformedBy,
  } as unknown as PerformedByResolverService;
  const notify = jest.fn().mockResolvedValue(undefined);
  const notifySupervisors = jest.fn().mockResolvedValue(undefined);
  const notificationsService = {
    notify,
    notifySupervisors,
  } as unknown as NotificationsService;
  const matrixWhatsappContactService = {
    sendHsm: jest.fn(),
  } as unknown as MatrixWhatsappContactService;
  const isAgentSendToCancellationAllowed = jest
    .fn()
    .mockResolvedValue(false);
  const settingsService = {
    isAgentSendToCancellationAllowed,
  } as unknown as SettingsService;

  return {
    service: new CollectionCasesService(
      repository,
      performedByResolver,
      matrixWhatsappContactService,
      notificationsService,
      settingsService,
    ),
    resolvePerformedBy,
    matrixWhatsappContactService,
    settingsMocks: {
      isAgentSendToCancellationAllowed,
    },
    notificationMocks: {
      notify,
      notifySupervisors,
    },
  };
}

const supervisorPerformer: AuthenticatedUser = {
  id: 'usr_custom',
  email: 'supervisor@ger.local',
  name: 'Supervisão',
  avatarUrl: null,
  roles: ['SUPERVISOR'],
};

const agentPerformer: AuthenticatedUser = {
  id: 'usr_agent',
  email: 'agente@ger.local',
  name: 'Atendente',
  avatarUrl: null,
  roles: ['COLLECTION_AGENT'],
};

function createRepository(
  overrides: Partial<CollectionCasesRepository> = {},
): CollectionCasesRepository {
  return {
    listCases: jest.fn(),
    listCaseIds: jest.fn(),
    getOverdueDateSummary: jest.fn(),
    getPortfolios: jest.fn(),
    getCaseById: jest.fn(),
    getCaseTimeline: jest.fn(),
    createAttempt: jest.fn(),
    getContactContext: jest.fn(),
    recordWhatsAppContactIntegration: jest.fn(),
    createPromise: jest.fn(),
    updatePromiseStatus: jest.fn(),
    sendToCancellation: jest.fn(),
    revertCancellation: jest.fn(),
    assignCase: jest.fn(),
    bulkAssignCases: jest.fn(),
    autoDistributeCases: jest.fn(),
    ...overrides,
  };
}

describe('CollectionCasesService', () => {
  it('usa contrato de repository para listagem', async () => {
    const paginated = createPaginatedResponse([], 1, 10, 0);
    const listCases = jest.fn().mockResolvedValue(paginated);
    const repository = createRepository({ listCases });

    const { service } = createService(repository);
    const response = await service.listCases({ page: 1, limit: 10 });

    expect(listCases).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(response.data.pagination.total).toBe(0);
  });

  it('usa contrato de repository para resumo de vencimentos', async () => {
    const summary = {
      firstDueDates: [{ date: '2026-08-04', count: 12 }],
      secondDueDates: [{ date: '2026-09-04', count: 12 }],
    };
    const getOverdueDateSummary = jest.fn().mockResolvedValue(summary);
    const repository = createRepository({ getOverdueDateSummary });

    const { service } = createService(repository);
    const response = await service.getOverdueDateSummary({
      page: 1,
      limit: 10,
    });

    expect(getOverdueDateSummary).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(response.data).toEqual(summary);
  });

  it('retorna 404 quando repository nao encontra caso', async () => {
    const repository = createRepository({
      getCaseById: jest.fn().mockResolvedValue(null),
    });

    const { service } = createService(repository);

    await expect(service.getCaseById('case_inexistente')).rejects.toMatchObject(
      {
        status: HttpStatus.NOT_FOUND,
      },
    );
  });

  it('retorna detalhe quando repository encontra caso', async () => {
    const details = mockCollectionCaseDetails.case_0001;
    const repository = createRepository({
      getCaseById: jest.fn().mockResolvedValue(details),
    });

    const { service } = createService(repository);
    const response = await service.getCaseById('case_0001');

    expect(response.data.id).toBe('case_0001');
  });

  it('retorna timeline quando repository encontra caso', async () => {
    const details = mockCollectionCaseDetails.case_0001;
    const timeline = {
      caseId: 'case_0001',
      events: [
        {
          id: 'case-case_0001-created',
          type: 'CASE_CREATED',
          title: 'Caso de cobranca criado',
          description: 'Caso aberto.',
          occurredAt: new Date().toISOString(),
        },
      ],
    };
    const repository = createRepository({
      getCaseById: jest.fn().mockResolvedValue(details),
      getCaseTimeline: jest.fn().mockResolvedValue(timeline),
    });

    const { service } = createService(repository);
    const response = await service.getCaseTimeline('case_0001');

    expect(response.data.caseId).toBe('case_0001');
    expect(response.data.events).toHaveLength(1);
  });

  it('retorna 404 ao buscar timeline de caso inexistente', async () => {
    const repository = createRepository({
      getCaseById: jest.fn().mockResolvedValue(null),
      getCaseTimeline: jest.fn().mockResolvedValue(null),
    });

    const { service } = createService(repository);

    await expect(
      service.getCaseTimeline('case_inexistente'),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('bloqueia detalhe quando agente tenta acessar caso de outra carteira', async () => {
    const details = {
      ...mockCollectionCaseDetails.case_0001,
      assignedTo: { id: 'usr_marina', name: 'Marina Lopes' },
    };
    const repository = createRepository({
      getCaseById: jest.fn().mockResolvedValue(details),
    });
    const user = {
      id: 'usr_outro',
      email: 'outro@ger.local',
      name: 'Outro Agente',
      avatarUrl: null,
      roles: ['COLLECTION_AGENT'],
    } satisfies AuthenticatedUser;

    const { service } = createService(repository);

    await expect(service.getCaseById('case_0001', user)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('cria tentativa quando repository retorna registro', async () => {
    const attempt = {
      id: 'att_new',
      collectionCaseId: 'case_0001',
      channel: 'PHONE',
      result: 'CONTACTED',
      attemptedAt: new Date().toISOString(),
      notes: 'Cliente atendeu.',
      nextContactAt: null,
      performedByUserId: 'usr_marina',
    };
    const createAttempt = jest.fn().mockResolvedValue(attempt);
    const repository = createRepository({ createAttempt });

    const { service, resolvePerformedBy } = createService(repository);
    const response = await service.createAttempt(
      'case_0001',
      {
        channel: 'PHONE',
        result: 'CONTACTED',
        notes: 'Cliente atendeu.',
      },
      'usr_custom',
    );

    expect(resolvePerformedBy).toHaveBeenCalledWith('usr_custom');
    expect(createAttempt).toHaveBeenCalledWith({
      caseId: 'case_0001',
      input: {
        channel: 'PHONE',
        result: 'CONTACTED',
        notes: 'Cliente atendeu.',
      },
      performedByUserId: 'usr_marina',
    });
    expect(response.data.id).toBe('att_new');
  });

  it('retorna 404 ao criar tentativa para caso inexistente', async () => {
    const repository = createRepository({
      createAttempt: jest.fn().mockResolvedValue(null),
    });

    const { service } = createService(repository);

    await expect(
      service.createAttempt(
        'case_inexistente',
        {
          channel: 'PHONE',
          result: 'NO_ANSWER',
        },
        'usr_marina',
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('salva codigos Matrix ao solicitar contato por WhatsApp', async () => {
    const getContactContext = jest.fn().mockResolvedValue({
      id: 'case_0001',
      status: 'IN_COLLECTION',
      customer: {
        id: 'cus_1',
        name: 'Cliente Teste',
        phone: '(51) 99999-9999',
      },
      contract: {
        id: 'ctr_1',
        code: 'CTR-001',
      },
    });
    const recordWhatsAppContactIntegration = jest.fn().mockResolvedValue({
      attemptId: 'att_matrix',
      integrationEventId: 'evt_matrix',
      matrixAttendanceCode: '5081836',
      matrixMessageCode: '82498574',
    });
    const repository = createRepository({
      getContactContext,
      recordWhatsAppContactIntegration,
    });
    const { service, matrixWhatsappContactService } = createService(repository);

    jest.mocked(matrixWhatsappContactService).sendHsm.mockResolvedValue({
      provider: 'n8n',
      statusCode: 200,
      responseBody: {
        success: true,
        codAtendimento: '5081836',
        codMensagem: '82498574',
      },
      codAtendimento: '5081836',
      codMensagem: '82498574',
    });

    const response = await service.contactCustomerByWhatsApp(
      'case_0001',
      'usr_marina',
    );

    expect(recordWhatsAppContactIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case_0001',
        status: 'COMPLETED',
        matrixAttendanceCode: '5081836',
        matrixMessageCode: '82498574',
      }),
    );
    expect(response.data).toMatchObject({
      attemptId: 'att_matrix',
      codAtendimento: '5081836',
      codMensagem: '82498574',
      awaitingReply: true,
    });
  });

  it('cria promessa quando repository retorna registro', async () => {
    const promise = {
      id: 'prm_new',
      collectionCaseId: 'case_0001',
      status: 'ACTIVE',
      promisedAmount: '1500.00',
      promisedDate: '2026-07-01T00:00:00.000Z',
      notes: 'Acordo confirmado.',
      fulfilledAt: null,
      brokenAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      createdByUserId: 'usr_marina',
    };
    const createPromise = jest.fn().mockResolvedValue(promise);
    const repository = createRepository({ createPromise });

    const { service, resolvePerformedBy } = createService(repository);
    const response = await service.createPromise(
      'case_0001',
      {
        promisedAmount: 1500,
        promisedDate: '2026-07-01T00:00:00.000Z',
        notes: 'Acordo confirmado.',
      },
      'usr_custom',
    );

    expect(resolvePerformedBy).toHaveBeenCalledWith('usr_custom');
    expect(createPromise).toHaveBeenCalledWith({
      caseId: 'case_0001',
      input: {
        promisedAmount: 1500,
        promisedDate: '2026-07-01T00:00:00.000Z',
        notes: 'Acordo confirmado.',
      },
      createdByUserId: 'usr_marina',
    });
    expect(response.data.id).toBe('prm_new');
  });

  it('retorna 404 ao criar promessa para caso inexistente', async () => {
    const repository = createRepository({
      createPromise: jest.fn().mockResolvedValue(null),
    });

    const { service } = createService(repository);

    await expect(
      service.createPromise(
        'case_inexistente',
        {
          promisedAmount: 100,
          promisedDate: '2026-07-01T00:00:00.000Z',
        },
        'usr_marina',
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('atribui caso a um usuario e resolve o executor', async () => {
    const details = mockCollectionCaseDetails.case_0001;
    const assignCase = jest
      .fn()
      .mockResolvedValue({ outcome: 'success', case: details });
    const repository = createRepository({ assignCase });

    const { service, resolvePerformedBy } = createService(repository);
    const response = await service.assignCase(
      'case_0001',
      { assignedUserId: 'usr_carlos' },
      'usr_custom',
    );

    expect(resolvePerformedBy).toHaveBeenCalledWith('usr_custom');
    expect(assignCase).toHaveBeenCalledWith({
      caseId: 'case_0001',
      assignedUserId: 'usr_carlos',
      performedByUserId: 'usr_marina',
    });
    expect(response.data.id).toBe('case_0001');
  });

  it('remove a atribuicao quando assignedUserId nao e informado', async () => {
    const details = mockCollectionCaseDetails.case_0001;
    const assignCase = jest
      .fn()
      .mockResolvedValue({ outcome: 'success', case: details });
    const repository = createRepository({ assignCase });

    const { service } = createService(repository);
    await service.assignCase('case_0001', {}, 'usr_marina');

    expect(assignCase).toHaveBeenCalledWith({
      caseId: 'case_0001',
      assignedUserId: null,
      performedByUserId: 'usr_marina',
    });
  });

  it('retorna 404 ao atribuir caso inexistente', async () => {
    const repository = createRepository({
      assignCase: jest.fn().mockResolvedValue({ outcome: 'case_not_found' }),
    });

    const { service } = createService(repository);

    await expect(
      service.assignCase(
        'case_inexistente',
        { assignedUserId: 'x' },
        'usr_marina',
      ),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it('retorna 422 ao atribuir usuario inexistente ou inativo', async () => {
    const repository = createRepository({
      assignCase: jest.fn().mockResolvedValue({ outcome: 'user_not_found' }),
    });

    const { service } = createService(repository);

    await expect(
      service.assignCase(
        'case_0001',
        { assignedUserId: 'inativo' },
        'usr_marina',
      ),
    ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
  });

  it('marca promessa como cumprida quando repository retorna sucesso', async () => {
    const promise = {
      id: 'prm_new',
      collectionCaseId: 'case_0001',
      status: 'FULFILLED',
      promisedAmount: '1500.00',
      promisedDate: '2026-07-01T00:00:00.000Z',
      notes: null,
      fulfilledAt: new Date().toISOString(),
      brokenAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      createdByUserId: 'usr_marina',
    };
    const updatePromiseStatus = jest
      .fn()
      .mockResolvedValue({ outcome: 'success', promise });
    const repository = createRepository({ updatePromiseStatus });

    const { service, resolvePerformedBy, notificationMocks } =
      createService(repository);
    const response = await service.fulfillPromise(
      'case_0001',
      'prm_new',
      { notes: 'Pagamento confirmado.' },
      'usr_custom',
    );

    expect(resolvePerformedBy).toHaveBeenCalledWith('usr_custom');
    expect(updatePromiseStatus).toHaveBeenCalledWith({
      caseId: 'case_0001',
      promiseId: 'prm_new',
      action: 'FULFILLED',
      input: { notes: 'Pagamento confirmado.' },
      performedByUserId: 'usr_marina',
    });
    expect(response.data).toMatchObject({ status: 'FULFILLED' });
    expect(notificationMocks.notifySupervisors).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAYMENT_PROMISE_FULFILLED',
        title: 'Promessa cumprida: Cliente',
        entityType: 'collection_case',
        entityId: 'case_0001',
      }),
    );
  });

  it('retorna 409 ao tentar alterar promessa com transicao invalida', async () => {
    const repository = createRepository({
      updatePromiseStatus: jest.fn().mockResolvedValue({
        outcome: 'invalid_transition',
        currentStatus: 'FULFILLED',
      }),
    });

    const { service } = createService(repository);

    await expect(
      service.breakPromise('case_0001', 'prm_new', {}, 'usr_marina'),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
  });

  it('retorna 404 ao atualizar promessa inexistente', async () => {
    const repository = createRepository({
      updatePromiseStatus: jest.fn().mockResolvedValue({
        outcome: 'promise_not_found',
      }),
    });

    const { service } = createService(repository);

    await expect(
      service.cancelPromise('case_0001', 'prm_missing', {}, 'usr_marina'),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('encaminha caso para cancelamento quando repository retorna sucesso', async () => {
    const cancellationProcess = {
      id: 'can_new',
      collectionCaseId: 'case_0001',
      status: 'PENDING',
      reason: 'Cliente recusou acordo.',
      notes: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    const sendToCancellation = jest
      .fn()
      .mockResolvedValue({ outcome: 'success', cancellationProcess });
    const repository = createRepository({ sendToCancellation });

    const { service, resolvePerformedBy } = createService(repository);
    const response = await service.sendToCancellation(
      'case_0001',
      { reason: 'Cliente recusou acordo.' },
      supervisorPerformer,
    );

    expect(resolvePerformedBy).toHaveBeenCalledWith('usr_custom');
    expect(sendToCancellation).toHaveBeenCalledWith({
      caseId: 'case_0001',
      input: { reason: 'Cliente recusou acordo.' },
      performedByUserId: 'usr_marina',
    });
    expect(response.data.id).toBe('can_new');
  });

  it('retorna 409 ao encaminhar caso ja em cancelamento', async () => {
    const repository = createRepository({
      sendToCancellation: jest
        .fn()
        .mockResolvedValue({ outcome: 'already_in_cancellation' }),
    });

    const { service } = createService(repository);

    await expect(
      service.sendToCancellation(
        'case_0001',
        {
          reason: 'Cliente recusou acordo.',
        },
        supervisorPerformer,
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
  });

  it('retorna 409 ao encaminhar caso com status nao permitido', async () => {
    const repository = createRepository({
      sendToCancellation: jest.fn().mockResolvedValue({
        outcome: 'status_not_allowed',
        currentStatus: 'RECOVERED',
      }),
    });

    const { service } = createService(repository);

    await expect(
      service.sendToCancellation(
        'case_0001',
        {
          reason: 'Cliente recusou acordo.',
        },
        supervisorPerformer,
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
  });

  it('bloqueia atendente quando a chave global esta desligada', async () => {
    const sendToCancellation = jest.fn();
    const repository = createRepository({ sendToCancellation });

    const { service, settingsMocks } = createService(repository);
    settingsMocks.isAgentSendToCancellationAllowed.mockResolvedValue(false);

    await expect(
      service.sendToCancellation(
        'case_0001',
        { reason: 'Cliente recusou acordo.' },
        agentPerformer,
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });

    expect(sendToCancellation).not.toHaveBeenCalled();
  });

  it('permite atendente quando a chave global esta ligada', async () => {
    const cancellationProcess = {
      id: 'can_agent',
      collectionCaseId: 'case_0001',
      status: 'PENDING',
      reason: 'Cliente recusou acordo.',
      notes: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    const sendToCancellation = jest
      .fn()
      .mockResolvedValue({ outcome: 'success', cancellationProcess });
    const repository = createRepository({ sendToCancellation });

    const { service, settingsMocks } = createService(repository);
    settingsMocks.isAgentSendToCancellationAllowed.mockResolvedValue(true);

    const response = await service.sendToCancellation(
      'case_0001',
      { reason: 'Cliente recusou acordo.' },
      agentPerformer,
    );

    expect(sendToCancellation).toHaveBeenCalledTimes(1);
    expect(response.data.id).toBe('can_agent');
  });

  it('bulkSendToCancellation encaminha os elegiveis e reporta ignorados', async () => {
    const sendToCancellation = jest
      .fn()
      .mockResolvedValueOnce({
        outcome: 'success',
        cancellationProcess: { id: 'can_1' },
      })
      .mockResolvedValueOnce({ outcome: 'already_in_cancellation' });
    const repository = createRepository({ sendToCancellation });

    const { service } = createService(repository);
    const response = await service.bulkSendToCancellation(
      { caseIds: ['case_0001', 'case_0002'], reason: 'Motivo em lote' },
      supervisorPerformer,
    );

    expect(sendToCancellation).toHaveBeenCalledTimes(2);
    expect(response.data).toEqual({
      requested: 2,
      sent: 1,
      skipped: [{ caseId: 'case_0002', reason: 'already_in_cancellation' }],
    });
  });

  it('bulkSendToCancellation deduplica caseIds repetidos', async () => {
    const sendToCancellation = jest.fn().mockResolvedValue({
      outcome: 'success',
      cancellationProcess: { id: 'can_1' },
    });
    const repository = createRepository({ sendToCancellation });

    const { service } = createService(repository);
    const response = await service.bulkSendToCancellation(
      { caseIds: ['case_0001', 'case_0001'], reason: 'Motivo' },
      supervisorPerformer,
    );

    expect(sendToCancellation).toHaveBeenCalledTimes(1);
    expect(response.data.requested).toBe(1);
    expect(response.data.sent).toBe(1);
  });

  it('reverte cancelamento e credita o responsavel resolvido', async () => {
    const details = mockCollectionCaseDetails.case_0001;
    const revertCancellation = jest
      .fn()
      .mockResolvedValue({ outcome: 'success', case: details });
    const repository = createRepository({ revertCancellation });

    const { service, resolvePerformedBy } = createService(repository);
    const response = await service.revertCancellation(
      'case_0001',
      { reason: 'Cliente reteve o contrato.' },
      'usr_custom',
    );

    expect(resolvePerformedBy).toHaveBeenCalledWith('usr_custom');
    expect(revertCancellation).toHaveBeenCalledWith({
      caseId: 'case_0001',
      input: { reason: 'Cliente reteve o contrato.' },
      performedByUserId: 'usr_marina',
    });
    expect(response.data.id).toBe('case_0001');
  });

  it('retorna 404 ao reverter caso inexistente', async () => {
    const repository = createRepository({
      revertCancellation: jest
        .fn()
        .mockResolvedValue({ outcome: 'case_not_found' }),
    });

    const { service } = createService(repository);

    await expect(
      service.revertCancellation(
        'case_inexistente',
        { reason: 'Cliente reteve o contrato.' },
        'usr_marina',
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('retorna 409 ao reverter caso com status nao permitido', async () => {
    const repository = createRepository({
      revertCancellation: jest.fn().mockResolvedValue({
        outcome: 'status_not_allowed',
        currentStatus: 'CLOSED',
      }),
    });

    const { service } = createService(repository);

    await expect(
      service.revertCancellation(
        'case_0001',
        { reason: 'Cliente reteve o contrato.' },
        'usr_marina',
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
  });
});
