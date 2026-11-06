export type AuditLogCategory =
  | 'CONTACT'
  | 'PROMISE'
  | 'CANCELLATION'
  | 'ASSIGNMENT'
  | 'STATUS'
  | 'ACCESS'
  | 'EXPORT'
  | 'OTHER';

export type AuditLogPresentation = {
  category: AuditLogCategory;
  // Trecho da frase entre o nome de quem agiu e o do cliente, ex.:
  // "registrou uma tentativa de contato com".
  verb: string;
  // Complemento curto (motivo, valor, de quem para quem), quando existir.
  detail: string | null;
};

export type AuditLogPresentationContext = {
  action: string;
  metadata?: unknown;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  // Nomes de usuários citados nos snapshots (ex.: nova responsável).
  userNames?: ReadonlyMap<string, string>;
};

const STATUS_LABELS: Record<string, string> = {
  WAITING_TRIAGE: 'Aguardando triagem',
  IN_COLLECTION: 'Em cobrança',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  NO_RESPONSE: 'Sem resposta',
  ELIGIBLE_FOR_CANCELLATION: 'Elegível ao cancelamento',
  CANCELLATION_IN_PROGRESS: 'Cancelamento em andamento',
  CLOSED: 'Encerrado',
  RECOVERED: 'Recuperado',
  PAYMENT_MADE: 'Pagamento realizado',
  RENEGOTIATED: 'Renegociado',
  CANCELLED_IN_RECOVERY: 'Cancelado em recuperação',
  REACTIVATED: 'Reativado',
};

const CHANNEL_LABELS: Record<string, string> = {
  PHONE: 'Telefone',
  EMAIL: 'E-mail',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  LETTER: 'Carta',
  IN_PERSON: 'Presencial',
  OTHER: 'Outro canal',
};

const RESULT_LABELS: Record<string, string> = {
  CONTACTED: 'cliente contatado',
  NO_ANSWER: 'sem resposta',
  VOICEMAIL: 'caixa postal',
  PROMISE_MADE: 'cliente prometeu pagar',
  REFUSED: 'cliente recusou',
  WRONG_NUMBER: 'número errado',
  CALLBACK_REQUESTED: 'pediu retorno',
  OTHER: 'outro resultado',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatMoney(value: unknown): string | null {
  const number = Number(value);

  if (value === null || value === undefined || !Number.isFinite(number)) {
    return null;
  }

  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: unknown): string | null {
  const text = asString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function join(parts: Array<string | null>): string | null {
  const filled = parts.filter((part): part is string => Boolean(part));

  return filled.length > 0 ? filled.join(' · ') : null;
}

function resolveAssignment(context: AuditLogPresentationContext) {
  const before = asRecord(context.beforeSnapshot);
  const after = asRecord(context.afterSnapshot);
  const fromId = asString(before?.assignedUserId);
  const toId = asString(after?.assignedUserId);
  const fromName = fromId ? (context.userNames?.get(fromId) ?? null) : null;
  const toName = toId ? (context.userNames?.get(toId) ?? null) : null;

  if (!toId) {
    return {
      verb: 'removeu a atribuição de',
      detail: fromName ? `Antes: ${fromName}` : null,
    };
  }

  return {
    verb: 'atribuiu',
    detail: join([
      toName ? `Para: ${toName}` : null,
      fromName ? `Antes: ${fromName}` : 'Antes: sem responsável',
    ]),
  };
}

// Traduz um registro técnico de auditoria em algo que a gerência entenda:
// categoria (para filtro e cor), trecho de frase e um detalhe curto.
export function resolveAuditLogPresentation(
  context: AuditLogPresentationContext,
): AuditLogPresentation {
  const { action } = context;
  const meta = asRecord(context.metadata);
  const before = asRecord(context.beforeSnapshot);
  const after = asRecord(context.afterSnapshot);
  const resourceType = asString(meta?.resourceType);
  const metaAction = asString(meta?.action);

  if (action === 'CREATE' && resourceType === 'PAYMENT_PROMISE') {
    return {
      category: 'PROMISE',
      verb: 'criou uma promessa de pagamento para',
      detail: join([
        formatMoney(after?.promisedAmount),
        formatDate(after?.promisedDate)
          ? `prometida para ${formatDate(after?.promisedDate)}`
          : null,
      ]),
    };
  }

  if (action === 'CREATE' && asString(meta?.attemptId)) {
    const channel = CHANNEL_LABELS[asString(after?.channel) ?? ''] ?? null;
    const result = RESULT_LABELS[asString(after?.result) ?? ''] ?? null;

    return {
      category: 'CONTACT',
      verb: 'registrou uma tentativa de contato com',
      detail: join([channel, result]),
    };
  }

  if (action === 'INTEGRATION' && resourceType === 'COLLECTION_ATTEMPT') {
    return {
      category: 'CONTACT',
      verb: 'enviou uma mensagem de WhatsApp (HSM) para',
      detail: null,
    };
  }

  if (action === 'STATUS_CHANGE' && resourceType === 'PAYMENT_PROMISE') {
    const outcome: Record<string, string> = {
      FULFILLED: 'cumprida',
      BROKEN: 'quebrada',
      CANCELLED: 'cancelada',
    };

    return {
      category: 'PROMISE',
      verb: `marcou como ${outcome[metaAction ?? ''] ?? 'atualizada'} a promessa de pagamento de`,
      detail: null,
    };
  }

  if (action === 'STATUS_CHANGE' && resourceType === 'CANCELLATION_PROCESS') {
    if (metaAction === 'COMPLETED') {
      return {
        category: 'CANCELLATION',
        verb: 'concluiu o processo de cancelamento de',
        detail: null,
      };
    }

    const reason = asString(meta?.reason);

    return {
      category: 'CANCELLATION',
      verb: 'encaminhou ao cancelamento',
      detail: reason ? `Motivo: ${reason}` : null,
    };
  }

  if (action === 'STATUS_CHANGE' && resourceType === 'CANCELLATION_STEP') {
    return {
      category: 'CANCELLATION',
      verb: 'concluiu uma etapa do cancelamento de',
      detail: null,
    };
  }

  if (metaAction === 'REVERT_CANCELLATION') {
    const reason = asString(meta?.reason);

    return {
      category: 'CANCELLATION',
      verb: 'reverteu o cancelamento de',
      detail: reason ? `Motivo: ${reason}` : null,
    };
  }

  if (metaAction === 'RECOVER_CANCELLED') {
    return {
      category: 'CANCELLATION',
      verb: 'recuperou o cliente cancelado',
      detail: null,
    };
  }

  if (metaAction === 'CANCELLED_RECOVERY_RECOVERED') {
    return {
      category: 'CANCELLATION',
      verb: 'recuperou o cliente cancelado',
      detail: 'Contrato reativado no ERP, com contato e observação registrados',
    };
  }

  if (metaAction === 'CANCELLED_RECOVERY_REACTIVATED') {
    return {
      category: 'CANCELLATION',
      verb: 'registrou a reativação do contrato de',
      detail:
        'Voltou sem contato qualificado antes: sem receita para o atendente',
    };
  }

  if (action === 'UPDATE' && metaAction === 'REOPEN_CANCELLED') {
    const assignment = resolveAssignment(context);

    return {
      category: 'ASSIGNMENT',
      verb: 'devolveu à carteira o cliente cancelado',
      detail: assignment.detail,
    };
  }

  if (action === 'UPDATE' && asString(meta?.field) === 'assignedUserId') {
    return { category: 'ASSIGNMENT', ...resolveAssignment(context) };
  }

  if (action === 'STATUS_CHANGE') {
    const from = STATUS_LABELS[asString(before?.status) ?? ''] ?? null;
    const to = STATUS_LABELS[asString(after?.status) ?? ''] ?? null;

    return {
      category: 'STATUS',
      verb: to
        ? `alterou a situação para ${to.toLowerCase()} de`
        : 'alterou a situação de',
      detail: from && to ? `${from} → ${to}` : null,
    };
  }

  if (action === 'LOGIN' && asString(meta?.outcome) === 'DENIED') {
    const reasons: Record<string, string> = {
      NOT_REGISTERED: 'E-mail não cadastrado na plataforma',
      INACTIVE: 'Usuário inativo ou bloqueado',
    };

    return {
      category: 'ACCESS',
      verb: 'teve o acesso recusado',
      detail: join([
        reasons[asString(meta?.reason) ?? ''] ?? null,
        asString(meta?.email),
      ]),
    };
  }

  if (action === 'LOGIN' || action === 'LOGOUT') {
    return {
      category: 'ACCESS',
      verb: action === 'LOGIN' ? 'entrou na plataforma' : 'saiu da plataforma',
      detail: null,
    };
  }

  if (action === 'EXPORT') {
    const rows = typeof meta?.rows === 'number' ? meta.rows : null;
    const filters = asRecord(meta?.filters);
    const filterText = filters
      ? Object.entries(filters)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(' · ')
      : '';

    return {
      category: 'EXPORT',
      verb:
        rows === null
          ? 'exportou dados'
          : `exportou ${rows} ${rows === 1 ? 'caso' : 'casos'} em CSV`,
      detail: filters ? filterText || 'Sem filtros' : null,
    };
  }

  return { category: 'OTHER', verb: 'realizou uma ação em', detail: null };
}
