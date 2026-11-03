import {
  buildRecoveryNotifications,
  buildRecoveryWebhookPayload,
  type RecoveredCaseForNotification,
} from '@/modules/erp-sync/recovery-notifications.builder';

function caseData(
  overrides: Partial<RecoveredCaseForNotification> = {},
): RecoveredCaseForNotification {
  return {
    caseId: 'case_1',
    customerName: 'Construtora Horizonte',
    recoveredAmount: 1500,
    assignedUser: {
      id: 'usr_marina',
      name: 'Marina',
      email: 'marina@ger.local',
    },
    hadActivePromise: false,
    ...overrides,
  };
}

describe('buildRecoveryNotifications', () => {
  it('gera uma notificacao por atendente responsavel', () => {
    const { agentNotifications } = buildRecoveryNotifications([
      caseData({ caseId: 'a' }),
      caseData({ caseId: 'b', customerName: 'Mercado Litoral' }),
    ]);

    expect(agentNotifications).toHaveLength(2);
    expect(agentNotifications[0]).toMatchObject({
      userId: 'usr_marina',
      email: 'marina@ger.local',
      entityId: 'a',
    });
    expect(agentNotifications[0]?.body).toContain('Construtora Horizonte');
    expect(agentNotifications[0]?.body).toContain('R$ 1.500,00');
  });

  it('ignora casos sem responsavel na notificacao individual', () => {
    const { agentNotifications, supervisorSummary } =
      buildRecoveryNotifications([caseData({ assignedUser: null })]);

    expect(agentNotifications).toHaveLength(0);
    // Mas ainda entra no resumo da supervisao.
    expect(supervisorSummary?.count).toBe(1);
  });

  it('menciona a promessa quando o caso tinha promessa ativa', () => {
    const { agentNotifications } = buildRecoveryNotifications([
      caseData({ hadActivePromise: true }),
    ]);

    expect(agentNotifications[0]?.title).toBe(
      'Promessa cumprida — cliente regularizou',
    );
    expect(agentNotifications[0]?.body).toContain('cumpriu a promessa');
  });

  it('consolida a supervisao num unico resumo com total', () => {
    const { supervisorSummary } = buildRecoveryNotifications([
      caseData({ caseId: 'a', recoveredAmount: 1000 }),
      caseData({ caseId: 'b', recoveredAmount: 2500, assignedUser: null }),
    ]);

    expect(supervisorSummary).not.toBeNull();
    expect(supervisorSummary?.count).toBe(2);
    expect(supervisorSummary?.totalAmount).toBe(3500);
    expect(supervisorSummary?.body).toContain('2 clientes');
    expect(supervisorSummary?.body).toContain('R$ 3.500,00');
  });

  it('retorna resumo nulo quando nada foi recuperado', () => {
    const { agentNotifications, supervisorSummary } =
      buildRecoveryNotifications([]);

    expect(agentNotifications).toHaveLength(0);
    expect(supervisorSummary).toBeNull();
  });
});

describe('buildRecoveryWebhookPayload', () => {
  it('monta o payload do N8N com destinatarios e total', () => {
    const payload = buildRecoveryWebhookPayload(
      [
        caseData({ caseId: 'a', recoveredAmount: 1000 }),
        caseData({ caseId: 'b', recoveredAmount: 500, assignedUser: null }),
      ],
      ['sup@ger.local'],
      new Date('2026-09-09T12:00:00.000Z'),
    );

    expect(payload).not.toBeNull();
    expect(payload?.event).toBe('cases.recovered');
    expect(payload?.occurredAt).toBe('2026-09-09T12:00:00.000Z');
    expect(payload?.summary).toEqual({ count: 2, totalAmount: 1500 });
    expect(payload?.supervisorEmails).toEqual(['sup@ger.local']);
    expect(payload?.cases).toHaveLength(2);
    expect(payload?.cases[0]?.agent).toEqual({
      name: 'Marina',
      email: 'marina@ger.local',
    });
    // Caso sem responsavel entra no lote com agent null.
    expect(payload?.cases[1]?.agent).toBeNull();
  });

  it('retorna null quando nada foi recuperado', () => {
    expect(buildRecoveryWebhookPayload([], ['sup@ger.local'])).toBeNull();
  });
});
