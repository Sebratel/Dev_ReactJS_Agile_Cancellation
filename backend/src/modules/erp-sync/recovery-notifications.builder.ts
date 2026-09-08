export type RecoveredCaseForNotification = {
  caseId: string;
  customerName: string;
  recoveredAmount: number;
  assignedUser: { id: string; name: string; email: string | null } | null;
  hadActivePromise: boolean;
};

export type AgentRecoveryNotification = {
  userId: string;
  email: string | null;
  title: string;
  body: string;
  entityId: string;
};

export type SupervisorRecoverySummary = {
  count: number;
  totalAmount: number;
  title: string;
  body: string;
};

export type RecoveryNotifications = {
  agentNotifications: AgentRecoveryNotification[];
  supervisorSummary: SupervisorRecoverySummary | null;
};

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function buildAgentBody(caseData: RecoveredCaseForNotification): string {
  const amount = formatBRL(caseData.recoveredAmount);
  const base = caseData.hadActivePromise
    ? `${caseData.customerName} cumpriu a promessa e regularizou o pagamento (${amount}).`
    : `${caseData.customerName} regularizou o pagamento (${amount}).`;
  return base;
}

/**
 * Monta as notificacoes de "cliente regularizou" a partir dos casos recuperados
 * numa rodada de reconciliacao. Cada atendente responsavel recebe uma
 * notificacao por cliente da sua carteira; a supervisao recebe um unico resumo
 * consolidado da rodada (evita inundacao numa leva de pagamentos).
 */
export function buildRecoveryNotifications(
  recoveredCases: RecoveredCaseForNotification[],
): RecoveryNotifications {
  const agentNotifications: AgentRecoveryNotification[] = [];

  for (const caseData of recoveredCases) {
    if (!caseData.assignedUser) {
      continue;
    }

    agentNotifications.push({
      userId: caseData.assignedUser.id,
      email: caseData.assignedUser.email,
      title: caseData.hadActivePromise
        ? 'Promessa cumprida — cliente regularizou'
        : 'Cliente regularizou o pagamento',
      body: buildAgentBody(caseData),
      entityId: caseData.caseId,
    });
  }

  const count = recoveredCases.length;

  if (count === 0) {
    return { agentNotifications, supervisorSummary: null };
  }

  const totalAmount = recoveredCases.reduce(
    (total, caseData) => total + caseData.recoveredAmount,
    0,
  );

  const supervisorSummary: SupervisorRecoverySummary = {
    count,
    totalAmount,
    title:
      count === 1
        ? '1 cliente regularizou o pagamento'
        : `${count} clientes regularizaram o pagamento`,
    body:
      count === 1
        ? `1 cliente regularizou o pagamento nesta sincronização (${formatBRL(totalAmount)} recuperado).`
        : `${count} clientes regularizaram o pagamento nesta sincronização (${formatBRL(totalAmount)} recuperado).`,
  };

  return { agentNotifications, supervisorSummary };
}
