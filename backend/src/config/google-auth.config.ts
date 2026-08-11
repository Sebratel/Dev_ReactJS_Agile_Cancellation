export type GoogleAuthConfig = {
  clientId: string;
  workspaceDomain: string;
};

export function getGoogleAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): GoogleAuthConfig {
  const clientId = env.GOOGLE_CLIENT_ID ?? '';
  const workspaceDomain = env.GOOGLE_WORKSPACE_DOMAIN ?? 'sebratel.com.br';
  const isProd = env.NODE_ENV === 'production';

  if (!clientId && isProd) {
    throw new Error(
      'GOOGLE_CLIENT_ID nao configurado. Necessario para validar o login Google em producao.',
    );
  }

  return { clientId, workspaceDomain };
}
