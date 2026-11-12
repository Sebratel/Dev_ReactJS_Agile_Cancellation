// MariaDB >= 11.6.2 liga `innodb_snapshot_isolation` por padrao: uma transacao (REPEATABLE READ)
// que tenta alterar uma linha modificada por outra transacao DEPOIS do seu snapshot falha com
// erro 1020 ("Record has changed since last read") em vez de esperar. O Prisma expoe isso como
// P2034 ou como erro desconhecido com "code: 1020"; deadlocks (1213) seguem o mesmo caminho.
// A operacao inteira (transacao) deve ser repetida do zero, entao so use este helper em torno de
// escritas IDEMPOTENTES (upsert, set de valores, incremento dentro da propria transacao).

const WRITE_CONFLICT_PATTERN =
  /Record has changed since last read|code: 1020\b|Deadlock found|code: 1213\b|write conflict or a deadlock/i;

export function isWriteConflictError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if ('code' in error && (error as { code?: unknown }).code === 'P2034') {
    return true;
  }

  const message =
    'message' in error ? (error as { message?: unknown }).message : '';

  return typeof message === 'string' && WRITE_CONFLICT_PATTERN.test(message);
}

export type RetryOnWriteConflictOptions = {
  /** Total de tentativas (padrao 4). */
  attempts?: number;
  /** Base do backoff exponencial em ms (padrao 40). */
  baseDelayMs?: number;
  /** Chamado a cada nova tentativa (log). */
  onRetry?: (attempt: number, error: unknown) => void;
  /** Injetaveis para teste. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

export async function retryOnWriteConflict<T>(
  operation: () => Promise<T>,
  options: RetryOnWriteConflictOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 4);
  const baseDelayMs = options.baseDelayMs ?? 40;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !isWriteConflictError(error)) {
        throw error;
      }

      options.onRetry?.(attempt, error);
      // backoff exponencial com jitter total: evita que transacoes concorrentes colidam de novo juntas
      await sleep(Math.round(random() * baseDelayMs * 2 ** attempt));
    }
  }
}
