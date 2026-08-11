export type MatrixContactConfig = {
  webhookUrl: string | null;
  webhookSecret: string | null;
  timeoutMs: number;
};

export function getMatrixContactConfig(
  env: NodeJS.ProcessEnv = process.env,
): MatrixContactConfig {
  const webhookUrl = env.N8N_MATRIX_HSM_WEBHOOK_URL?.trim();
  const webhookSecret = env.N8N_MATRIX_HSM_WEBHOOK_SECRET?.trim();
  const parsedTimeout = Number(env.N8N_MATRIX_HSM_TIMEOUT_MS ?? 15_000);

  return {
    webhookUrl: webhookUrl && webhookUrl.length > 0 ? webhookUrl : null,
    webhookSecret:
      webhookSecret && webhookSecret.length > 0 ? webhookSecret : null,
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : 15_000,
  };
}
