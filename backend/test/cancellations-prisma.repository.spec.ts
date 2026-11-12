/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) retornam any */
import type { PrismaService } from '@/database/prisma/prisma.service';
import { CancellationsPrismaRepository } from '@/modules/cancellations/repositories/cancellations-prisma.repository';
import {
  areAllCancellationStepsCompleted,
  mapCancellationStepToResponse,
} from '@/modules/cancellations/utils/cancellation-step.utils';
import {
  getCancellationStepLabel,
  isDefaultCancellationStepCode,
} from '@/modules/cancellations/constants/default-cancellation-steps.constants';

const asPrisma = (value: unknown) => value as PrismaService;

type StepStatus = 'PENDING' | 'COMPLETED';

function step(id: string, name: string, order: number, status: StepStatus) {
  return {
    id,
    name,
    stepOrder: order,
    status,
    externalId: null,
    completedAt: null,
    metadata: null,
    cancellationProcessId: 'can-1',
  };
}

describe('cancellation-step.utils', () => {
  it('mapeia etapa com metadata, protocolo e data', () => {
    const response = mapCancellationStepToResponse(
      {
        id: 's1',
        cancellationProcessId: 'can-1',
        name: 'APPLY_FINE',
        stepOrder: 2,
        status: 'COMPLETED',
        externalId: 'PROTO-1',
        completedAt: new Date('2026-06-01T10:00:00.000Z'),
        metadata: { notes: 'obs', completedByName: 'Ana' },
      },
      'can-1',
    );
    expect(response).toEqual(
      expect.objectContaining({
        stepCode: 'APPLY_FINE',
        name: 'Aplicar multa',
        externalProtocol: 'PROTO-1',
        notes: 'obs',
        completedByName: 'Ana',
        completedAt: '2026-06-01T10:00:00.000Z',
      }),
    );
  });

  it('trata metadata invalida, data em texto e ausencia de data', () => {
    const base = {
      id: 's1',
      cancellationProcessId: 'can-1',
      name: 'CODIGO_DESCONHECIDO',
      stepOrder: 1,
      status: 'PENDING',
    };
    const asText = mapCancellationStepToResponse(
      { ...base, completedAt: '2026-01-01', metadata: ['x'] },
      'can-1',
    );
    expect(asText.completedAt).toBe('2026-01-01');
    expect(asText.notes).toBeNull();
    expect(asText.name).toBe('CODIGO_DESCONHECIDO');

    const empty = mapCancellationStepToResponse(
      {
        ...base,
        completedAt: null,
        metadata: { notes: 1, completedByName: 2 },
      },
      'can-1',
    );
    expect(empty.completedAt).toBeNull();
    expect(empty.notes).toBeNull();
    expect(empty.completedByName).toBeNull();
    expect(empty.externalProtocol).toBeNull();
  });

  it('verifica se todas as etapas foram concluidas', () => {
    expect(areAllCancellationStepsCompleted([])).toBe(false);
    expect(
      areAllCancellationStepsCompleted([
        { status: 'COMPLETED' },
        { status: 'PENDING' },
      ]),
    ).toBe(false);
    expect(areAllCancellationStepsCompleted([{ status: 'COMPLETED' }])).toBe(
      true,
    );
  });

  it('resolve rotulos e codigos das etapas padrao', () => {
    expect(getCancellationStepLabel('LOWER_TITLES')).toBe('Baixar titulos');
    expect(getCancellationStepLabel('OUTRO')).toBe('OUTRO');
    expect(isDefaultCancellationStepCode('ROUTE_PROTOCOL')).toBe(true);
    expect(isDefaultCancellationStepCode('OUTRO')).toBe(false);
  });
});

describe('CancellationsPrismaRepository', () => {
  describe('getProcessContext', () => {
    it('retorna process_not_found', async () => {
      const repository = new CancellationsPrismaRepository(
        asPrisma({
          cancellationProcess: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        }),
      );
      await expect(repository.getProcessContext('x')).resolves.toEqual({
        outcome: 'process_not_found',
      });
    });

    it('monta o contexto com responsavel e etapas', async () => {
      const findUnique = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'can-1',
          status: 'PENDING',
          collectionCase: { assignedUserId: 'u1' },
          steps: [step('s1', 'LOWER_TITLES', 1, 'PENDING')],
        })
        .mockResolvedValueOnce({
          id: 'can-2',
          status: 'PENDING',
          collectionCase: null,
          steps: [],
        });
      const repository = new CancellationsPrismaRepository(
        asPrisma({ cancellationProcess: { findUnique } }),
      );

      await expect(repository.getProcessContext('can-1')).resolves.toEqual({
        outcome: 'found',
        context: {
          cancellationId: 'can-1',
          processStatus: 'PENDING',
          caseAssignedUserId: 'u1',
          steps: [
            { stepCode: 'LOWER_TITLES', stepOrder: 1, status: 'PENDING' },
          ],
        },
      });
      const second = await repository.getProcessContext('can-2');
      expect(
        second.outcome === 'found' && second.context.caseAssignedUserId,
      ).toBeNull();
    });
  });

  describe('validateElevenRequestEligibility', () => {
    const run = async (process: unknown) => {
      const repository = new CancellationsPrismaRepository(
        asPrisma({
          cancellationProcess: {
            findUnique: jest.fn().mockResolvedValue(process),
          },
        }),
      );
      return repository.validateElevenRequestEligibility('can-1');
    };

    it('cobre todos os resultados possiveis', async () => {
      await expect(run(null)).resolves.toEqual({
        outcome: 'process_not_found',
      });
      await expect(run({ status: 'COMPLETED', steps: [] })).resolves.toEqual({
        outcome: 'process_already_completed',
      });
      await expect(run({ status: 'PENDING', steps: [] })).resolves.toEqual({
        outcome: 'step_not_found',
      });
      await expect(
        run({
          status: 'PENDING',
          steps: [step('s', 'OPEN_ELEVEN_REQUEST', 3, 'COMPLETED')],
        }),
      ).resolves.toEqual({ outcome: 'step_already_completed' });
      await expect(
        run({
          status: 'PENDING',
          steps: [step('s', 'OPEN_ELEVEN_REQUEST', 3, 'PENDING')],
        }),
      ).resolves.toEqual({ outcome: 'eligible' });
    });
  });

  describe('completeStep', () => {
    const baseParams = {
      cancellationId: 'can-1',
      stepCode: 'LOWER_TITLES',
      input: { notes: 'feito', externalProtocol: 'P-1' },
      performedByUserId: 'u1',
      performedByName: 'Ana',
    };

    function build(process: unknown, existingCase: unknown = null) {
      const savedStep = {
        ...step('s1', 'LOWER_TITLES', 1, 'COMPLETED'),
        completedAt: new Date('2026-06-01T10:00:00.000Z'),
        externalId: 'P-1',
        metadata: { notes: 'feito', completedByName: 'Ana' },
      };
      const tx = {
        cancellationStep: { update: jest.fn().mockResolvedValue(savedStep) },
        cancellationProcess: { update: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
        collectionCase: {
          findUnique: jest.fn().mockResolvedValue(existingCase),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const prisma = {
        cancellationProcess: {
          findUnique: jest.fn().mockResolvedValue(process),
        },
        $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      };
      return {
        tx,
        repository: new CancellationsPrismaRepository(asPrisma(prisma)),
      };
    }

    it('retorna os resultados de erro de lookup', async () => {
      await expect(
        build(null).repository.completeStep(baseParams),
      ).resolves.toEqual({ outcome: 'process_not_found' });
      await expect(
        build({ steps: [], status: 'PENDING' }).repository.completeStep(
          baseParams,
        ),
      ).resolves.toEqual({ outcome: 'step_not_found' });
      await expect(
        build({
          status: 'PENDING',
          steps: [step('s1', 'LOWER_TITLES', 1, 'COMPLETED')],
        }).repository.completeStep(baseParams),
      ).resolves.toEqual({ outcome: 'step_already_completed' });
    });

    it('conclui uma etapa sem finalizar o processo', async () => {
      const { tx, repository } = build({
        id: 'can-1',
        status: 'PENDING',
        collectionCaseId: 'c1',
        steps: [
          step('s1', 'LOWER_TITLES', 1, 'PENDING'),
          step('s2', 'APPLY_FINE', 2, 'PENDING'),
        ],
      });

      const result = await repository.completeStep({
        ...baseParams,
        input: {
          ...baseParams.input,
          completedAt: '2026-06-01T10:00:00.000Z',
        },
        integrationMetadata: { provider: 'eleven' },
      });

      expect(result.outcome).toBe('success');
      expect(result.outcome === 'success' && result.processCompleted).toBe(
        false,
      );
      expect(tx.cancellationProcess.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
      expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({ provider: 'eleven' }),
        }),
      });
      expect(tx.collectionCase.update).not.toHaveBeenCalled();
    });

    it('ao concluir a ultima etapa finaliza o processo e fecha o caso', async () => {
      const { tx, repository } = build(
        {
          id: 'can-1',
          status: 'IN_PROGRESS',
          collectionCaseId: 'c1',
          steps: [step('s1', 'LOWER_TITLES', 1, 'PENDING')],
        },
        { id: 'c1', status: 'CANCELLATION_IN_PROGRESS' },
      );

      const result = await repository.completeStep(baseParams);

      expect(result.outcome === 'success' && result.processCompleted).toBe(
        true,
      );
      expect(tx.cancellationProcess.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
      expect(tx.collectionCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CLOSED' }),
        }),
      );
      expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
    });

    it('finaliza o processo sem caso vinculado ou com caso inexistente', async () => {
      const semCaso = build({
        id: 'can-1',
        status: 'IN_PROGRESS',
        collectionCaseId: null,
        steps: [step('s1', 'LOWER_TITLES', 1, 'PENDING')],
      });
      await semCaso.repository.completeStep({
        ...baseParams,
        input: {},
      });
      expect(semCaso.tx.auditLog.create).not.toHaveBeenCalled();
      expect(semCaso.tx.collectionCase.findUnique).not.toHaveBeenCalled();

      const casoAusente = build(
        {
          id: 'can-1',
          status: 'IN_PROGRESS',
          collectionCaseId: 'c1',
          steps: [step('s1', 'LOWER_TITLES', 1, 'PENDING')],
        },
        null,
      );
      await casoAusente.repository.completeStep(baseParams);
      expect(casoAusente.tx.collectionCase.update).not.toHaveBeenCalled();
    });
  });
});
