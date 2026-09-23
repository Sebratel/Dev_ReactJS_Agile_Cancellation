import { buildCancellationNotifications } from '@/modules/erp-sync/cancellation-notifications.builder';

describe('buildCancellationNotifications', () => {
  it('gera notificação por atendente responsável e resumo da supervisão', () => {
    const { agentNotifications, supervisorSummary } =
      buildCancellationNotifications([
        {
          caseId: 'c1',
          customerName: 'Cliente A',
          assignedUser: { id: 'u1', name: 'Ana', email: null },
        },
        { caseId: 'c2', customerName: 'Cliente B', assignedUser: null },
      ]);

    expect(agentNotifications).toHaveLength(1);
    expect(agentNotifications[0]?.userId).toBe('u1');
    expect(agentNotifications[0]?.body).toContain('não foi pagamento');
    expect(supervisorSummary?.count).toBe(2);
    expect(supervisorSummary?.title).toBe('2 clientes cancelaram o contrato');
  });

  it('sem casos → sem resumo', () => {
    const result = buildCancellationNotifications([]);
    expect(result.agentNotifications).toHaveLength(0);
    expect(result.supervisorSummary).toBeNull();
  });

  it('1 caso → título no singular', () => {
    const result = buildCancellationNotifications([
      {
        caseId: 'c1',
        customerName: 'Cliente Único',
        assignedUser: { id: 'u1', name: 'Ana', email: null },
      },
    ]);
    expect(result.supervisorSummary?.title).toBe('1 cliente cancelou o contrato');
  });
});
