import {
  buildRecoveryNotifications,
  type RecoveredCaseForNotification,
} from '@/modules/erp-sync/recovery-notifications.builder';

function caseData(
  overrides: Partial<RecoveredCaseForNotification> = {},
): RecoveredCaseForNotification {
  return {
    caseId: 'case_1',
    customerName: 'Construtora Horizonte',
    recoveredAmount: 1500,
    assignedUser: { id: 'usr_marina', name: 'Marina', email: 'marina@ger.local' },
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
    const { agentNotifications, supervisorSummary } = buildRecoveryNotifications([
      caseData({ assignedUser: null }),
    ]);

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
