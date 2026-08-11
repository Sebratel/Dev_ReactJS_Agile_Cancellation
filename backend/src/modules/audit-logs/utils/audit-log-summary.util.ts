function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function resolveAuditLogSummary(
  action: string,
  metadata?: unknown,
): string {
  const meta = asRecord(metadata);
  const resourceType = meta?.resourceType;

  if (action === 'CREATE') {
    if (resourceType === 'PAYMENT_PROMISE') {
      return 'Promessa de pagamento criada';
    }

    if (typeof meta?.attemptId === 'string') {
      return 'Tentativa de cobranca registrada';
    }
  }

  if (action === 'STATUS_CHANGE') {
    if (
      resourceType === 'CANCELLATION_PROCESS' &&
      typeof meta?.reason === 'string'
    ) {
      return 'Caso encaminhado para cancelamento';
    }

    if (
      resourceType === 'CANCELLATION_PROCESS' &&
      meta?.action === 'COMPLETED'
    ) {
      return 'Processo de cancelamento concluido';
    }

    if (resourceType === 'CANCELLATION_STEP' && meta?.action === 'COMPLETED') {
      return 'Etapa de cancelamento concluida';
    }

    if (resourceType === 'PAYMENT_PROMISE') {
      if (meta?.action === 'FULFILLED') {
        return 'Promessa de pagamento cumprida';
      }

      if (meta?.action === 'BROKEN') {
        return 'Promessa de pagamento quebrada';
      }

      if (meta?.action === 'CANCELLED') {
        return 'Promessa de pagamento cancelada';
      }
    }

    return 'Status alterado';
  }

  const labels: Record<string, string> = {
    CREATE: 'Registro criado',
    UPDATE: 'Registro atualizado',
    DELETE: 'Registro excluido',
    STATUS_CHANGE: 'Status alterado',
    LOGIN: 'Login realizado',
    LOGOUT: 'Logout realizado',
    EXPORT: 'Exportacao realizada',
    IMPORT: 'Importacao realizada',
    INTEGRATION: 'Integracao executada',
  };

  return labels[action] ?? action;
}
