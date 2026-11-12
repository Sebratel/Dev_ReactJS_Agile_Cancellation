/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) retornam any */
import { CollectionStatus } from '@prisma/client';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import {
  buildRecoveryAuditCase,
  type RecoveryAuditCaseInput,
} from '@/modules/erp-sync/recovery-audit';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';

jest.mock('@/common/data-source/data-source.config', () => ({
  getDataSourceMode: jest.fn(),
}));

const mockedMode = jest.mocked(getDataSourceMode);

type Overrides = {
  status?: CollectionStatus;
  recoveredAmount?: string | null;
  agent?: unknown;
  updateCount?: number;
};

function build(overrides: Overrides = {}) {
  const updateMany = jest
    .fn()
    .mockResolvedValue({ count: overrides.updateCount ?? 1 });
  const auditCreate = jest.fn().mockResolvedValue({});
  const tx = {
    collectionCase: { updateMany },
    auditLog: { create: auditCreate },
  };
  const prisma = {
    collectionCase: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'c1',
        status: overrides.status ?? CollectionStatus.PAYMENT_MADE,
        contractId: 'ctr1',
        recoveredAt: new Date('2026-11-04T19:50:00.000Z'),
        recoveredAmount:
          overrides.recoveredAmount === undefined
            ? '139.86'
            : overrides.recoveredAmount,
        assignedUserId: 'old',
        customer: { name: 'ACME' },
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(
        overrides.agent === undefined
          ? {
              id: 'u1',
              name: 'Débora',
              status: 'ACTIVE',
              userRoles: [{ role: { code: 'COLLECTION_AGENT' } }],
            }
          : overrides.agent,
      ),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
  const notify = jest.fn().mockResolvedValue(undefined);
  const service = new ErpSyncService(
    {} as never,
    prisma,
    { notify } as never,
    {} as never,
  );

  return { service, updateMany, auditCreate, notify };
}

const input = { assignedUserId: 'u1', reason: 'Fechou por ligação' };

describe('ErpSyncService.creditCaseManually', () => {
  beforeEach(() => {
    mockedMode.mockReturnValue('database');
  });

  it('credita o atendente: vira RECOVERED, mantem a data e grava na auditoria', async () => {
    const { service, updateMany, auditCreate, notify } = build();

    const result = await service.creditCaseManually('c1', input, 'sup1');

    expect(result).toEqual({ outcome: 'success', amount: '139.86' });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1', status: CollectionStatus.PAYMENT_MADE },
        data: expect.objectContaining({
          status: CollectionStatus.RECOVERED,
          assignedUserId: 'u1',
          recoveredAt: new Date('2026-11-04T19:50:00.000Z'),
          recoveredAmount: '139.86',
        }),
      }),
    );
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        performedByUserId: 'sup1',
        metadata: expect.objectContaining({
          action: 'MANUAL_CREDIT',
          reason: 'Fechou por ligação',
          creditedUserId: 'u1',
        }),
      }),
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
    );
  });

  it('so credita caso com pagamento realizado', async () => {
    const { service, updateMany } = build({
      status: CollectionStatus.IN_COLLECTION,
    });

    expect(await service.creditCaseManually('c1', input, 'sup1')).toEqual({
      outcome: 'status_not_allowed',
      status: CollectionStatus.IN_COLLECTION,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('caso ja recuperado nao e creditado de novo', async () => {
    const { service } = build({ status: CollectionStatus.RECOVERED });

    expect(
      (await service.creditCaseManually('c1', input, 'sup1')).outcome,
    ).toBe('status_not_allowed');
  });

  it('recusa atendente inativo ou sem perfil de cobranca', async () => {
    const inactive = build({
      agent: {
        id: 'u1',
        name: 'X',
        status: 'INACTIVE',
        userRoles: [{ role: { code: 'COLLECTION_AGENT' } }],
      },
    });
    const wrongRole = build({
      agent: {
        id: 'u1',
        name: 'X',
        status: 'ACTIVE',
        userRoles: [{ role: { code: 'FINANCE' } }],
      },
    });

    expect(
      (await inactive.service.creditCaseManually('c1', input, 's')).outcome,
    ).toBe('user_not_found');
    expect(
      (await wrongRole.service.creditCaseManually('c1', input, 's')).outcome,
    ).toBe('user_not_found');
  });

  it('corrida: se o status mudou no meio, nao grava auditoria nem notifica', async () => {
    const { service, auditCreate, notify } = build({ updateCount: 0 });

    expect(
      (await service.creditCaseManually('c1', input, 'sup1')).outcome,
    ).toBe('status_not_allowed');
    expect(auditCreate).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('buildRecoveryAuditCase (credito manual da supervisao)', () => {
  const base: RecoveryAuditCaseInput = {
    caseId: 'c1',
    customerName: 'ACME',
    contractCode: '1',
    recoveredAt: new Date('2026-11-04T19:50:00.000Z'),
    recoveredAmount: 99.9,
    cycleStartedAt: null,
    assignedUser: { id: 'u1', name: 'Débora' },
    attempts: [],
    payments: [
      {
        titleNumber: '1',
        paidDate: new Date('2026-11-04T00:00:00.000Z'),
        registeredAt: null,
        amount: 99.9,
        receivedAmount: 99.9,
        paymentForm: 'Pix',
      },
    ],
  };

  it('sem contato mas com atribuicao: pagamento e valor conferem e o caso fica verificado', () => {
    const result = buildRecoveryAuditCase({
      ...base,
      manualCredit: {
        at: new Date('2026-11-09T12:00:00.000Z'),
        by: { id: 's1', name: 'Paulo' },
        reason: 'Fechou por ligação',
      },
    });

    expect(result.checks.map((c) => c.key)).toEqual([
      'payment_confirmed',
      'manual_credit',
      'amount_match',
    ]);
    expect(result.verified).toBe(true);
    expect(result.manualCredit).toMatchObject({
      reason: 'Fechou por ligação',
      by: { name: 'Paulo' },
    });
  });

  it('o credito manual nao esconde pagamento que nao confere', () => {
    const result = buildRecoveryAuditCase({
      ...base,
      payments: [],
      manualCredit: {
        at: new Date('2026-11-09T12:00:00.000Z'),
        by: null,
        reason: 'x',
      },
    });

    expect(
      result.checks.find((c) => c.key === 'payment_confirmed')?.status,
    ).toBe('fail');
    expect(result.verified).toBe(false);
  });

  it('sem credito manual e sem contato continua reprovado', () => {
    const result = buildRecoveryAuditCase(base);

    expect(result.manualCredit).toBeNull();
    expect(result.verified).toBe(false);
  });
});
