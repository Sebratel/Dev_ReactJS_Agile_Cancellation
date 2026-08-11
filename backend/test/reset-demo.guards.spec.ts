import {
  RESET_DEMO_BLOCKED_IN_PRODUCTION_MESSAGE,
  RESET_DEMO_CONFIRM_REQUIRED_MESSAGE,
  assertResetDemoConfirmed,
  assertResetDemoEnvironment,
  isResetDemoConfirmed,
} from '../prisma/seed/reset-demo-guards';

describe('reset-demo guards', () => {
  it('bloqueia execucao em production', () => {
    expect(() => assertResetDemoEnvironment('production')).toThrow(
      RESET_DEMO_BLOCKED_IN_PRODUCTION_MESSAGE,
    );
  });

  it('permite execucao fora de production', () => {
    expect(() => assertResetDemoEnvironment('development')).not.toThrow();
    expect(() => assertResetDemoEnvironment('test')).not.toThrow();
    expect(() => assertResetDemoEnvironment(undefined)).not.toThrow();
  });

  it('exige flag --confirm', () => {
    expect(() => assertResetDemoConfirmed([])).toThrow(
      RESET_DEMO_CONFIRM_REQUIRED_MESSAGE,
    );
    expect(() => assertResetDemoConfirmed(['--dry-run'])).toThrow(
      RESET_DEMO_CONFIRM_REQUIRED_MESSAGE,
    );
  });

  it('aceita flag --confirm', () => {
    expect(() => assertResetDemoConfirmed(['--confirm'])).not.toThrow();
  });

  it('aceita RESET_DEMO_CONFIRM=true', () => {
    const previous = process.env.RESET_DEMO_CONFIRM;

    process.env.RESET_DEMO_CONFIRM = 'true';
    expect(isResetDemoConfirmed([])).toBe(true);

    process.env.RESET_DEMO_CONFIRM = previous;
  });
});
