export type GoogleAuthConfig = {
  clientId: string;
  mode: 'auto' | 'mock' | 'real';
  workspaceDomain: string;
};

export function getGoogleAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): GoogleAuthConfig {
  const clientId = env.GOOGLE_CLIENT_ID ?? '';
  const mode = parseGoogleAuthMode(env.GOOGLE_AUTH_MODE);
  const workspaceDomain = env.GOOGLE_WORKSPACE_DOMAIN ?? 'sebratel.com.br';
  const isProd = env.NODE_ENV === 'production';

  if (!clientId && isProd && mode === 'real') {
    throw new Error(
      'GOOGLE_CLIENT_ID nao configurado. Necessario para validar o login Google em producao.',
    );
  }

  return { clientId, mode, workspaceDomain };
}

function parseGoogleAuthMode(value?: string): GoogleAuthConfig['mode'] {
  if (value === 'mock' || value === 'real') {
    return value;
  }

  return 'auto';
}
