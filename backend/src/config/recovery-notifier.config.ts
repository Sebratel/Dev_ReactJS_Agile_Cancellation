export type RecoveryNotifierConfig = {
  webhookUrl: string | null;
  webhookSecret: string | null;
  timeoutMs: number;
};

/**
 * Webhook N8N que entrega as notificacoes de "cliente regularizou" (e-mail,
 * WhatsApp, etc. — o canal fica a cargo do fluxo no N8N). Mesmo padrao do
 * disparo de HSM Matrix. Sem URL configurada, o disparo e apenas ignorado.
 */
export function getRecoveryNotifierConfig(
  env: NodeJS.ProcessEnv = process.env,
): RecoveryNotifierConfig {
  const webhookUrl = env.N8N_RECOVERY_WEBHOOK_URL?.trim();
  const webhookSecret = env.N8N_RECOVERY_WEBHOOK_SECRET?.trim();
  const parsedTimeout = Number(env.N8N_RECOVERY_TIMEOUT_MS ?? 15_000);

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
