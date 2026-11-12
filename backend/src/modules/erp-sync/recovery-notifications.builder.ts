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
  // Quando a rodada regularizou UM único cliente, aponta o caso para a
  // notificação da supervisão virar clicável (abre o cliente). Null quando há
  // mais de um cliente (resumo consolidado, sem alvo único).
  entityId: string | null;
};

export type RecoveryNotifications = {
  agentNotifications: AgentRecoveryNotification[];
  supervisorSummary: SupervisorRecoverySummary | null;
};

export type RecoveryWebhookCase = {
  caseId: string;
  customerName: string;
  recoveredAmount: number;
  hadActivePromise: boolean;
  agent: { name: string; email: string | null } | null;
};

export type RecoveryWebhookPayload = {
  event: 'cases.recovered';
  occurredAt: string;
  summary: { count: number; totalAmount: number };
  supervisorEmails: string[];
  cases: RecoveryWebhookCase[];
};

/**
 * Payload enviado ao N8N por rodada de reconciliacao. Carrega os dados e os
 * destinatarios (atendente por caso + e-mails da supervisao) para que o fluxo
 * no N8N decida os canais (e-mail, WhatsApp, etc.). Retorna null quando nada
 * foi recuperado.
 */
export function buildRecoveryWebhookPayload(
  recoveredCases: RecoveredCaseForNotification[],
  supervisorEmails: string[],
  occurredAt: Date = new Date(),
): RecoveryWebhookPayload | null {
  if (recoveredCases.length === 0) {
    return null;
  }

  const totalAmount = recoveredCases.reduce(
    (total, caseData) => total + caseData.recoveredAmount,
    0,
  );

  return {
    event: 'cases.recovered',
    occurredAt: occurredAt.toISOString(),
    summary: { count: recoveredCases.length, totalAmount },
    supervisorEmails,
    cases: recoveredCases.map((caseData) => ({
      caseId: caseData.caseId,
      customerName: caseData.customerName,
      recoveredAmount: caseData.recoveredAmount,
      hadActivePromise: caseData.hadActivePromise,
      agent: caseData.assignedUser
        ? {
            name: caseData.assignedUser.name,
            email: caseData.assignedUser.email,
          }
        : null,
    })),
  };
}

function formatBRL(value: number): string {
  return `R$ ${value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
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

  // Com 1 cliente, o resumo identifica o cliente e vira clicável (abre o caso).
  const single = count === 1 ? recoveredCases[0] : null;
  const supervisorSummary: SupervisorRecoverySummary = {
    count,
    totalAmount,
    entityId: single?.caseId ?? null,
    title: single
      ? single.hadActivePromise
        ? `${single.customerName} cumpriu a promessa`
        : `${single.customerName} regularizou o pagamento`
      : `${count} clientes regularizaram o pagamento`,
    body: single
      ? `${single.customerName} regularizou o pagamento nesta sincronização (${formatBRL(totalAmount)} recuperado).`
      : `${count} clientes regularizaram o pagamento nesta sincronização (${formatBRL(totalAmount)} recuperado).`,
  };

  return { agentNotifications, supervisorSummary };
}
