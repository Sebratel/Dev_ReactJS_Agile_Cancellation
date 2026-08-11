export const RESET_DEMO_CONFIRM_FLAG = '--confirm';

export const RESET_DEMO_BLOCKED_IN_PRODUCTION_MESSAGE =
  'db:reset-demo nao pode ser executado com NODE_ENV=production.';

export const RESET_DEMO_CONFIRM_REQUIRED_MESSAGE =
  'db:reset-demo exige confirmacao explicita. Execute novamente com --confirm.';

export function assertResetDemoEnvironment(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnv === 'production') {
    throw new Error(RESET_DEMO_BLOCKED_IN_PRODUCTION_MESSAGE);
  }
}

export function isResetDemoConfirmed(
  argv: string[] = process.argv.slice(2),
): boolean {
  return (
    argv.includes(RESET_DEMO_CONFIRM_FLAG) ||
    process.env.RESET_DEMO_CONFIRM === 'true'
  );
}

export function assertResetDemoConfirmed(
  argv: string[] = process.argv.slice(2),
): void {
  if (!isResetDemoConfirmed(argv)) {
    throw new Error(RESET_DEMO_CONFIRM_REQUIRED_MESSAGE);
  }
}
