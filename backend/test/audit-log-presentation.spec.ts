import { resolveAuditLogPresentation } from '@/modules/audit-logs/utils/audit-log-presentation.util';
import {
  buildAuditLogsWhere,
  mapAuditLogRecord,
} from '@/modules/audit-logs/utils/audit-logs-list.utils';

describe('resolveAuditLogPresentation', () => {
  it('descreve uma tentativa de contato com canal e resultado', () => {
    const result = resolveAuditLogPresentation({
      action: 'CREATE',
      metadata: { attemptId: 'cabc' },
      afterSnapshot: { channel: 'WHATSAPP', result: 'NO_ANSWER' },
    });

    expect(result).toEqual({
      category: 'CONTACT',
      verb: 'registrou uma tentativa de contato com',
      detail: 'WhatsApp · sem resposta',
    });
  });

  it('descreve a criacao de promessa com valor e data', () => {
    const result = resolveAuditLogPresentation({
      action: 'CREATE',
      metadata: { resourceType: 'PAYMENT_PROMISE' },
      afterSnapshot: {
        promisedAmount: '199.80',
        promisedDate: '2026-11-12T00:00:00.000Z',
      },
    });

    expect(result.category).toBe('PROMISE');
    expect(result.detail).toContain('199,80');
    expect(result.detail).toContain('12/11/2026');
  });

  it('descreve o encaminhamento ao cancelamento com o motivo', () => {
    const result = resolveAuditLogPresentation({
      action: 'STATUS_CHANGE',
      metadata: { resourceType: 'CANCELLATION_PROCESS', reason: 'Sem retorno' },
    });

    expect(result).toEqual({
      category: 'CANCELLATION',
      verb: 'encaminhou ao cancelamento',
      detail: 'Motivo: Sem retorno',
    });
  });

  it('descreve a atribuicao com o nome de quem recebeu e de quem tinha', () => {
    const result = resolveAuditLogPresentation({
      action: 'UPDATE',
      metadata: { field: 'assignedUserId' },
      beforeSnapshot: { assignedUserId: 'u1' },
      afterSnapshot: { assignedUserId: 'u2' },
      userNames: new Map([
        ['u1', 'Debora'],
        ['u2', 'Stephany'],
      ]),
    });

    expect(result).toEqual({
      category: 'ASSIGNMENT',
      verb: 'atribuiu',
      detail: 'Para: Stephany · Antes: Debora',
    });
  });

  it('descreve remocao de atribuicao', () => {
    const result = resolveAuditLogPresentation({
      action: 'UPDATE',
      metadata: { field: 'assignedUserId' },
      beforeSnapshot: { assignedUserId: 'u1' },
      afterSnapshot: { assignedUserId: null },
      userNames: new Map([['u1', 'Debora']]),
    });

    expect(result.verb).toBe('removeu a atribuição de');
    expect(result.detail).toBe('Antes: Debora');
  });

  it('descreve a devolucao de cancelado a carteira', () => {
    const result = resolveAuditLogPresentation({
      action: 'UPDATE',
      metadata: { field: 'assignedUserId', action: 'REOPEN_CANCELLED' },
      beforeSnapshot: { assignedUserId: null },
      afterSnapshot: { assignedUserId: 'u2' },
      userNames: new Map([['u2', 'Stephany']]),
    });

    expect(result.category).toBe('ASSIGNMENT');
    expect(result.verb).toBe('devolveu à carteira o cliente cancelado');
    expect(result.detail).toContain('Para: Stephany');
  });

  it('descreve a recuperacao e a reativacao sem credito de cancelados', () => {
    expect(
      resolveAuditLogPresentation({
        action: 'STATUS_CHANGE',
        metadata: { action: 'CANCELLED_RECOVERY_RECOVERED' },
      }).verb,
    ).toBe('recuperou o cliente cancelado');
    expect(
      resolveAuditLogPresentation({
        action: 'STATUS_CHANGE',
        metadata: { action: 'CANCELLED_RECOVERY_REACTIVATED' },
      }).detail,
    ).toContain('sem receita');
  });

  it('cai numa descricao generica para acoes desconhecidas', () => {
    expect(resolveAuditLogPresentation({ action: 'DELETE' }).category).toBe(
      'OTHER',
    );
  });
});

describe('mapAuditLogRecord com contexto', () => {
  it('inclui cliente e contrato do caso e a foto de quem agiu', () => {
    const item = mapAuditLogRecord(
      {
        id: 'a1',
        entityType: 'COLLECTION_CASE',
        entityId: 'case1',
        action: 'CREATE',
        metadata: { attemptId: 'cabc' },
        afterSnapshot: { channel: 'PHONE', result: 'CONTACTED' },
        createdAt: new Date('2026-11-06T14:00:00.000Z'),
        performedBy: {
          id: 'u1',
          name: 'Lourdes',
          email: 'l@x.test',
          avatarUrl: 'https://x.test/a.jpg',
        },
      },
      {
        subjects: new Map([
          ['case1', { customerName: 'ACME LTDA', contractCode: '238580' }],
        ]),
      },
    );

    expect(item.subject).toEqual({
      customerName: 'ACME LTDA',
      contractCode: '238580',
    });
    expect(item.actor?.avatarUrl).toBe('https://x.test/a.jpg');
    expect(item.category).toBe('CONTACT');
  });
});

describe('buildAuditLogsWhere', () => {
  it('filtra por categoria de promessas pelo tipo de recurso', () => {
    const where = buildAuditLogsWhere({ category: 'PROMISE' });

    expect(where.AND).toEqual([
      { metadata: { path: '$.resourceType', equals: 'PAYMENT_PROMISE' } },
    ]);
  });

  it('a busca tambem encontra registros pelos casos do cliente/contrato', () => {
    const where = buildAuditLogsWhere({ search: 'acme' }, ['case1', 'case2']);

    expect(where.OR).toContainEqual({ entityId: { in: ['case1', 'case2'] } });
  });
});
