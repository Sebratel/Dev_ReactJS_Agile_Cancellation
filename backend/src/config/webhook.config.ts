export type WebhookConfig = {
  n8nSecret: string | null;
};

export function getWebhookConfig(
  env: NodeJS.ProcessEnv = process.env,
): WebhookConfig {
  const secret = env.N8N_WEBHOOK_SECRET?.trim();
  const isProd = env.NODE_ENV === 'production';

  if (isProd && (!secret || secret.length < 16)) {
    throw new Error(
      'N8N_WEBHOOK_SECRET nao configurado ou muito curto (minimo 16 caracteres) em producao.',
    );
  }

  return {
    n8nSecret: secret && secret.length > 0 ? secret : null,
  };
}
