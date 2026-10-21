// Lista de PERMISSAO (nao de bloqueio): dev-login, sessoes "dev:" / devSession
// e o verificador Google mock so existem com NODE_ENV em development/test E
// ENABLE_DEV_LOGIN=true. Qualquer outro valor de NODE_ENV (staging,
// production, vazio, typo...) deixa tudo desligado — sem derrubar o boot.
const DEV_LOGIN_NODE_ENVS = ['development', 'test'];

export function isDevLoginEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    DEV_LOGIN_NODE_ENVS.includes(env.NODE_ENV ?? '') &&
    env.ENABLE_DEV_LOGIN === 'true'
  );
}
