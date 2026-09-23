// Notificações de "cliente cancelou o contrato" — disparadas quando a
// reconciliação detecta que o contrato saiu da regra do ERP por CANCELAMENTO
// (e não por pagamento). Mesmo padrão das notificações de recuperação: uma por
// atendente responsável + um resumo consolidado para a supervisão.

export type CancelledCaseForNotification = {
  caseId: string;
  customerName: string;
  assignedUser: { id: string; name: string; email: string | null } | null;
};

export type AgentCancellationNotification = {
  userId: string;
  title: string;
  body: string;
  entityId: string;
};

export type SupervisorCancellationSummary = {
  count: number;
  title: string;
  body: string;
};

export type CancellationNotifications = {
  agentNotifications: AgentCancellationNotification[];
  supervisorSummary: SupervisorCancellationSummary | null;
};

export function buildCancellationNotifications(
  cancelledCases: CancelledCaseForNotification[],
): CancellationNotifications {
  const agentNotifications: AgentCancellationNotification[] = [];

  for (const caseData of cancelledCases) {
    if (!caseData.assignedUser) {
      continue;
    }

    agentNotifications.push({
      userId: caseData.assignedUser.id,
      title: 'Cliente cancelou o contrato',
      body: `${caseData.customerName} teve o contrato cancelado (não foi pagamento).`,
      entityId: caseData.caseId,
    });
  }

  const count = cancelledCases.length;

  if (count === 0) {
    return { agentNotifications, supervisorSummary: null };
  }

  const supervisorSummary: SupervisorCancellationSummary = {
    count,
    title:
      count === 1
        ? '1 cliente cancelou o contrato'
        : `${count} clientes cancelaram o contrato`,
    body:
      count === 1
        ? '1 cliente teve o contrato cancelado nesta sincronização (não foi pagamento).'
        : `${count} clientes tiveram o contrato cancelado nesta sincronização (não foi pagamento).`,
  };

  return { agentNotifications, supervisorSummary };
}
