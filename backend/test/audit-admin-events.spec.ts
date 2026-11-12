import { CaseNotesService } from '@/modules/case-notes/case-notes.service';
import type { AuditService } from '@/modules/audit/audit.service';
import { resolveAuditLogPresentation } from '@/modules/audit-logs/utils/audit-log-presentation.util';
import { buildAuditLogsWhere } from '@/modules/audit-logs/utils/audit-logs-list.utils';
import { SettingsService } from '@/modules/settings/settings.service';
import { UsersService } from '@/modules/users/users.service';
import { WhatsappBulkContactService } from '@/modules/whatsapp-bulk-contact/whatsapp-bulk-contact.service';

function audit() {
  const record = jest.fn().mockResolvedValue(undefined);

  return { record, service: { record } as unknown as AuditService };
}

describe('UsersService registra alteracoes de usuarios', () => {
  const baseUser = {
    id: 'u2',
    email: 'ana@sebratel.com.br',
    name: 'Ana',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['COLLECTION_AGENT'],
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('grava o cadastro com perfis e status', async () => {
    const { record, service: auditService } = audit();
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(baseUser),
    };
    const service = new UsersService(
      repository as never,
      {} as never,
      auditService,
    );

    await service.create(
      {
        email: 'Ana@sebratel.com.br',
        name: 'Ana',
        roles: ['COLLECTION_AGENT'],
      } as never,
      'admin-1',
    );

    expect(record).toHaveBeenCalledWith({
      action: 'CREATE',
      entityType: 'USER',
      entityId: 'u2',
      performedByUserId: 'admin-1',
      metadata: {
        resourceType: 'USER',
        targetName: 'Ana',
        targetEmail: 'ana@sebratel.com.br',
        roles: ['COLLECTION_AGENT'],
        status: 'ACTIVE',
      },
    });
  });

  it('grava so o que mudou na edicao e nada quando nao muda', async () => {
    const { record, service: auditService } = audit();
    const repository = {
      findById: jest.fn().mockResolvedValue(baseUser),
      update: jest
        .fn()
        .mockResolvedValueOnce({
          ...baseUser,
          status: 'INACTIVE',
          roles: ['SUPERVISOR'],
        })
        .mockResolvedValueOnce(baseUser),
    };
    const service = new UsersService(
      repository as never,
      {} as never,
      auditService,
    );

    await service.update('u2', {}, 'admin-1');
    expect(record).toHaveBeenCalledWith({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: 'u2',
      performedByUserId: 'admin-1',
      metadata: {
        resourceType: 'USER',
        targetName: 'Ana',
        targetEmail: 'ana@sebratel.com.br',
        changes: {
          status: { from: 'ACTIVE', to: 'INACTIVE' },
          roles: { from: 'COLLECTION_AGENT', to: 'SUPERVISOR' },
        },
      },
    });

    record.mockClear();
    await service.update('u2', {}, 'admin-1');
    expect(record).not.toHaveBeenCalled();
  });
});

describe('SettingsService registra alteracoes de configuracao', () => {
  it('grava o valor antes e depois, so quando muda', async () => {
    const { record, service: auditService } = audit();
    let stored: Record<string, string> = {};
    const repository = {
      getAll: jest.fn(() => Promise.resolve({ ...stored })),
      setMany: jest.fn((entries: Record<string, string>) => {
        stored = { ...stored, ...entries };
        return Promise.resolve();
      }),
    };
    const service = new SettingsService(repository, auditService);

    await service.updateSettings(
      { allowAgentSendToCancellation: true },
      'admin-1',
    );
    expect(record).toHaveBeenCalledWith({
      action: 'UPDATE',
      entityType: 'SETTINGS',
      entityId: 'allowAgentSendToCancellation',
      performedByUserId: 'admin-1',
      metadata: {
        resourceType: 'SETTING',
        key: 'allowAgentSendToCancellation',
        from: 'false',
        to: 'true',
      },
    });

    record.mockClear();
    await service.updateSettings(
      { allowAgentSendToCancellation: true },
      'admin-1',
    );
    expect(record).not.toHaveBeenCalled();
  });
});

describe('CaseNotesService registra a nota sem o texto', () => {
  it('grava que a nota existe e o tamanho', async () => {
    const { record, service: auditService } = audit();
    const repository = {
      getCaseAssigneeId: jest.fn().mockResolvedValue('usr_1'),
      create: jest.fn().mockResolvedValue({ id: 'n1' }),
    };
    const service = new CaseNotesService(
      repository as never,
      { resolve: (id: string) => id },
      auditService,
    );

    await service.create('case_1', { content: 'texto sigiloso' }, {
      id: 'usr_1',
      roles: ['SUPERVISOR'],
    } as never);

    expect(record).toHaveBeenCalledWith({
      action: 'CREATE',
      entityType: 'COLLECTION_CASE',
      entityId: 'case_1',
      performedByUserId: 'usr_1',
      metadata: { resourceType: 'CASE_NOTE', length: 14 },
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain('sigiloso');
  });
});

describe('WhatsappBulkContactService registra o envio em massa', () => {
  it('selecao manual e por filtro', async () => {
    const { record, service: auditService } = audit();
    const jobs = { createJob: jest.fn().mockResolvedValue({ id: 'job1' }) };
    const cases = { listCaseIds: jest.fn().mockResolvedValue(['a', 'b', 'c']) };
    const service = new WhatsappBulkContactService(
      jobs as never,
      cases as never,
      auditService,
    );

    await service.createJob(['a', 'b'], 'sup-1');
    expect(record).toHaveBeenLastCalledWith({
      action: 'CREATE',
      entityType: 'BULK_CONTACT_JOB',
      entityId: 'job1',
      performedByUserId: 'sup-1',
      metadata: {
        resourceType: 'BULK_CONTACT_JOB',
        total: 2,
        mode: 'SELECTION',
      },
    });

    await service.createJobByFilter(
      { page: 1, limit: 10, status: 'NO_RESPONSE', hsmDeliveryState: 'FAILED' },
      'sup-1',
    );
    expect(record).toHaveBeenLastCalledWith({
      action: 'CREATE',
      entityType: 'BULK_CONTACT_JOB',
      entityId: 'job1',
      performedByUserId: 'sup-1',
      metadata: {
        resourceType: 'BULK_CONTACT_JOB',
        total: 3,
        mode: 'FILTER',
        filters: { status: 'NO_RESPONSE', hsmDeliveryState: 'FAILED' },
      },
    });
  });
});

describe('apresentacao das acoes administrativas', () => {
  it('descreve cadastro e edicao de usuario', () => {
    const created = resolveAuditLogPresentation({
      action: 'CREATE',
      metadata: {
        resourceType: 'USER',
        targetName: 'Ana',
        roles: ['COLLECTION_AGENT', 'CANCELLATION_AGENT'],
        status: 'ACTIVE',
      },
    });
    expect(created.category).toBe('ADMIN');
    expect(created.verb).toBe('cadastrou o usuário Ana');
    expect(created.detail).toBe(
      'Perfis: Agente de cobrança, Agente de cancelamento · Status: Ativo',
    );

    const updated = resolveAuditLogPresentation({
      action: 'UPDATE',
      metadata: {
        resourceType: 'USER',
        targetName: 'Ana',
        changes: {
          status: { from: 'ACTIVE', to: 'INACTIVE' },
          roles: { from: 'COLLECTION_AGENT', to: 'SUPERVISOR' },
        },
      },
    });
    expect(updated.verb).toBe('alterou o usuário Ana');
    expect(updated.detail).toBe(
      'Status: Ativo → Inativo · Perfis: Agente de cobrança → Supervisor',
    );
  });

  it('descreve configuracao, nota e envio em massa', () => {
    expect(
      resolveAuditLogPresentation({
        action: 'UPDATE',
        metadata: {
          resourceType: 'SETTING',
          key: 'allowAgentSendToCancellation',
          from: 'false',
          to: 'true',
        },
      }),
    ).toEqual({
      category: 'ADMIN',
      verb: 'alterou a configuração',
      detail: 'Atendente pode encaminhar ao cancelamento: desligado → ligado',
    });

    expect(
      resolveAuditLogPresentation({
        action: 'CREATE',
        metadata: { resourceType: 'CASE_NOTE', length: 10 },
      }),
    ).toMatchObject({ category: 'NOTE', verb: 'registrou uma nota em' });

    const bulk = resolveAuditLogPresentation({
      action: 'CREATE',
      metadata: {
        resourceType: 'BULK_CONTACT_JOB',
        total: 120,
        mode: 'FILTER',
        filters: { status: 'NO_RESPONSE' },
      },
    });
    expect(bulk.category).toBe('MESSAGE');
    expect(bulk.verb).toBe('disparou um envio de HSM em massa para 120 casos');
    expect(bulk.detail).toBe('Por filtro: status: NO_RESPONSE');
  });

  it('filtra por nota, administracao e mensagens em massa', () => {
    expect(buildAuditLogsWhere({ category: 'NOTE' }).AND).toEqual([
      { metadata: { path: '$.resourceType', equals: 'CASE_NOTE' } },
    ]);
    expect(buildAuditLogsWhere({ category: 'ADMIN' }).AND).toEqual([
      {
        OR: [
          { metadata: { path: '$.resourceType', equals: 'USER' } },
          { metadata: { path: '$.resourceType', equals: 'SETTING' } },
        ],
      },
    ]);
    expect(buildAuditLogsWhere({ category: 'MESSAGE' }).AND).toEqual([
      { metadata: { path: '$.resourceType', equals: 'BULK_CONTACT_JOB' } },
    ]);
  });
});
