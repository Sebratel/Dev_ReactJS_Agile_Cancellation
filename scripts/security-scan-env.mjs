export const SENSITIVE_ENV_FILE_NAMES = [
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
];

export function getEnvFileViolation({
  fileName,
  exists,
  isTracked,
  isIgnored,
}) {
  if (!exists) {
    return null;
  }

  if (isTracked) {
    return `${fileName}: Arquivo de ambiente sensivel versionado no Git.`;
  }

  if (!isIgnored) {
    return `${fileName}: Arquivo de ambiente sensivel existe mas nao esta ignorado pelo Git.`;
  }

  return null;
}
