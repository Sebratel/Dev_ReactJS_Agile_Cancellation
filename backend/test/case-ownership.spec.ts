import { HttpStatus } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { CaseNotesService } from '@/modules/case-notes/case-notes.service';
import type { CaseNotesRepository } from '@/modules/case-notes/repositories/case-notes.repository';
import { CancellationsService } from '@/modules/cancellations/cancellations.service';
import type { CancellationsRepository } from '@/modules/cancellations/repositories/cancellations.repository';
import type { CancellationStepPolicyService } from '@/modules/cancellations/policies/cancellation-step-policy.service';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';
import type { CollectionCasesRepository } from '@/modules/collection-cases/repositories/collection-cases.repository';
import type { MatrixWhatsappContactService } from '@/modules/collection-cases/services/matrix-whatsapp-contact.service';
import type { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';
import { assertCanActOnCase } from '@/modules/collection-cases/utils/case-ownership.util';
import type { NotificationsService } from '@/modules/notifications/notifications.service';
import type { SettingsService } from '@/modules/settings/settings.service';

function user(
  id: string,
  roles: AuthenticatedUser['roles'],
): AuthenticatedUser {
  return { id, email: `${id}@ger.local`, name: id, avatarUrl: null, roles };
}

const owner = user('usr_owner', ['COLLECTION_AGENT']);
const other = user('usr_other', ['COLLECTION_AGENT']);
const cancellationOwner = user('usr_canc', ['CANCELLATION_AGENT']);
const supervisor = user('usr_sup', ['SUPERVISOR']);
const admin = user('usr_admin', ['ADMIN']);

const resolver = {
  resolve: (id: string) => id,
} as unknown as PerformedByResolverService;

describe('assertCanActOnCase', () => {
  it('dono passa; nao-dono e caso sem responsavel levam 403', () => {
    expect(() => assertCanActOnCase(owner, 'usr_owner')).not.toThrow();
    expect(() => assertCanActOnCase(other, 'usr_owner')).toThrow(AppException);
    expect(() => assertCanActOnCase(other, null)).toThrow(AppException);

    let status: number | undefined;
    try {
      assertCanActOnCase(other, 'usr_owner');
    } catch (error) {
      status = (error as AppException).getStatus();
    }
    expect(status).toBe(HttpStatus.FORBIDDEN);
  });

  it('supervisor e admin agem em qualquer caso', () => {
    expect(() => assertCanActOnCase(supervisor, 'usr_owner')).not.toThrow();
    expect(() => assertCanActOnCase(admin, null)).not.toThrow();
  });

  it('agente de cancelamento so age no proprio caso', () => {
    expect(() =>
      assertCanActOnCase(cancellationOwner, 'usr_canc'),
    ).not.toThrow();
    expect(() => assertCanActOnCase(cancellationOwner, 'usr_owner')).toThrow(
      AppException,
    );
  });

  it('sem ator ou sem dono informado nao bloqueia (chamada interna)', () => {
    expect(() => assertCanActOnCase(undefined, 'x')).not.toThrow();
    expect(() => assertCanActOnCase(other, undefined)).not.toThrow();
  });
});

describe('CollectionCasesService — escrita so no caso atribuido', () => {
  function setup() {
    const repository = {
      getCaseById: jest
        .fn()
        .mockResolvedValue({ id: 'case_1', assignedTo: { id: 'usr_owner' } }),
      createAttempt: jest.fn().mockResolvedValue({ id: 'att_1' }),
      createPromise: jest.fn().mockResolvedValue({ id: 'prm_1' }),
      updatePromiseStatus: jest.fn().mockResolvedValue({
        outcome: 'success',
        promise: { id: 'prm_1', status: 'FULFILLED' },
      }),
      sendToCancellation: jest
        .fn()
        .mockResolvedValue({ outcome: 'success', cancellationProcess: {} }),
      revertCancellation: jest
        .fn()
        .mockResolvedValue({ outcome: 'success', case: {} }),
      getContactContext: jest.fn().mockResolvedValue(null),
    };
    const service = new CollectionCasesService(
      repository as unknown as CollectionCasesRepository,
      resolver,
      {} as unknown as MatrixWhatsappContactService,
      {
        notify: jest.fn(),
        notifySupervisors: jest.fn(),
      } as unknown as NotificationsService,
      {
        isAgentSendToCancellationAllowed: jest.fn().mockResolvedValue(true),
      } as unknown as SettingsService,
    );
    return { service, repository };
  }

  const attemptDto = { channel: 'PHONE', result: 'CONTACTED' } as never;
  const promiseDto = {
    promisedDate: '2026-12-01',
    promisedAmount: '10.00',
  } as never;
  const statusDto = {} as never;
  const sendDto = { reason: 'x', assignedUserId: 'usr_canc' } as never;
  const revertDto = {} as never;

  type Repo = ReturnType<typeof setup>['repository'];
  const actions: Array<{
    name: string;
    run: (
      s: CollectionCasesService,
      actor: AuthenticatedUser,
    ) => Promise<unknown>;
    writeMock: keyof Repo;
  }> = [
    {
      name: 'criar tentativa',
      run: (s, a) => s.createAttempt('case_1', attemptDto, a.id, a),
      writeMock: 'createAttempt',
    },
    {
      name: 'criar promessa',
      run: (s, a) => s.createPromise('case_1', promiseDto, a.id, a),
      writeMock: 'createPromise',
    },
    {
      name: 'cumprir promessa',
      run: (s, a) => s.fulfillPromise('case_1', 'prm_1', statusDto, a.id, a),
      writeMock: 'updatePromiseStatus',
    },
    {
      name: 'quebrar promessa',
      run: (s, a) => s.breakPromise('case_1', 'prm_1', statusDto, a.id, a),
      writeMock: 'updatePromiseStatus',
    },
    {
      name: 'cancelar promessa',
      run: (s, a) => s.cancelPromise('case_1', 'prm_1', statusDto, a.id, a),
      writeMock: 'updatePromiseStatus',
    },
    {
      name: 'enviar para cancelamento',
      run: (s, a) => s.sendToCancellation('case_1', sendDto, a),
      writeMock: 'sendToCancellation',
    },
    {
      name: 'reverter cancelamento',
      run: (s, a) => s.revertCancellation('case_1', revertDto, a.id, a),
      writeMock: 'revertCancellation',
    },
    {
      name: 'contato WhatsApp',
      // getContactContext = null -> 404 depois da checagem de dono.
      run: (s, a) => s.contactCustomerByWhatsApp('case_1', a.id, a),
      writeMock: 'getContactContext',
    },
  ];

  describe.each(actions)('$name', ({ run, writeMock }) => {
    it('nao-dono recebe 403 e nada e gravado', async () => {
      const { service, repository } = setup();

      await expect(run(service, other)).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
      expect(repository[writeMock]).not.toHaveBeenCalled();
    });

    it('dono executa', async () => {
      const { service, repository } = setup();

      await run(service, owner).catch(() => undefined);

      expect(repository[writeMock]).toHaveBeenCalled();
    });

    it('supervisor e admin executam em caso de outro atendente', async () => {
      for (const actor of [supervisor, admin]) {
        const { service, repository } = setup();

        await run(service, actor).catch(() => undefined);

        expect(repository[writeMock]).toHaveBeenCalled();
      }
    });
  });

  it('caso sem responsavel: atendente leva 403, supervisor passa', async () => {
    const { service, repository } = setup();
    repository.getCaseById.mockResolvedValue({ id: 'case_1', assignedTo: null });

    await expect(
      service.createAttempt('case_1', attemptDto, owner.id, owner),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    await expect(
      service.createAttempt('case_1', attemptDto, supervisor.id, supervisor),
    ).resolves.toBeDefined();
  });

  it('agente de cancelamento so reverte o caso que e dele', async () => {
    const { service, repository } = setup();
    repository.getCaseById.mockResolvedValue({
      id: 'case_1',
      assignedTo: { id: 'usr_canc' },
    });

    await expect(
      service.revertCancellation(
        'case_1',
        revertDto,
        cancellationOwner.id,
        cancellationOwner,
      ),
    ).resolves.toBeDefined();
    await expect(
      service.revertCancellation('case_1', revertDto, other.id, other),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
  });

  it('caso inexistente continua 404 para atendente', async () => {
    const { service, repository } = setup();
    repository.getCaseById.mockResolvedValue(null);

    await expect(
      service.createAttempt('case_x', attemptDto, owner.id, owner),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });
});

describe('CaseNotesService — nota so no caso atribuido', () => {
  function setup(assigneeId: string | null | undefined, created = true) {
    const create = jest
      .fn()
      .mockResolvedValue(created ? { id: 'note_1' } : null);
    const repository = {
      getCaseAssigneeId: jest.fn().mockResolvedValue(assigneeId),
      create,
      listByCase: jest.fn(),
    } as unknown as CaseNotesRepository;

    return { service: new CaseNotesService(repository, resolver), create };
  }

  it('nao-dono 403; dono e supervisor criam', async () => {
    const forbidden = setup('usr_owner');
    await expect(
      forbidden.service.create('case_1', { content: 'oi' }, other),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(forbidden.create).not.toHaveBeenCalled();

    for (const actor of [owner, supervisor]) {
      const allowed = setup('usr_owner');
      await allowed.service.create('case_1', { content: 'oi' }, actor);
      expect(allowed.create).toHaveBeenCalled();
    }
  });

  it('caso inexistente segue para o 404 existente', async () => {
    const { service } = setup(undefined, false);

    await expect(
      service.create('case_x', { content: 'oi' }, other),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });
});

describe('CancellationsService.completeStep — etapa so no caso atribuido', () => {
  function setup(caseAssignedUserId: string | null) {
    const completeStep = jest
      .fn()
      .mockResolvedValue({ outcome: 'success', step: { id: 'step_1' } });
    const repository = {
      getProcessContext: jest.fn().mockResolvedValue({
        outcome: 'found',
        context: {
          cancellationId: 'canc_1',
          processStatus: 'IN_PROGRESS',
          caseAssignedUserId,
          steps: [
            { stepCode: 'ROUTE_PROTOCOL', stepOrder: 1, status: 'PENDING' },
          ],
        },
      }),
      completeStep,
    } as unknown as CancellationsRepository;
    const service = new CancellationsService(repository, resolver, {
      assertStepCompletionAllowed: jest.fn(),
    } as unknown as CancellationStepPolicyService);

    return { service, completeStep };
  }

  it('agente de cancelamento de outro caso recebe 403', async () => {
    const { service, completeStep } = setup('usr_owner');

    await expect(
      service.completeStep(
        'canc_1',
        'ROUTE_PROTOCOL',
        {},
        cancellationOwner,
      ),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(completeStep).not.toHaveBeenCalled();
  });

  it('dono (agente de cancelamento) e supervisor concluem a etapa', async () => {
    const mine = setup('usr_canc');
    await mine.service.completeStep(
      'canc_1',
      'ROUTE_PROTOCOL',
      {},
      cancellationOwner,
    );
    expect(mine.completeStep).toHaveBeenCalled();

    const sup = setup('usr_canc');
    await sup.service.completeStep(
      'canc_1',
      'ROUTE_PROTOCOL',
      {},
      supervisor,
    );
    expect(sup.completeStep).toHaveBeenCalled();
  });
});
