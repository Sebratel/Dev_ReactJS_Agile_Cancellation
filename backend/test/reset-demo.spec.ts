import { runDemoReset } from '../prisma/seed/run-demo-reset';
import {
  RESET_DEMO_BLOCKED_IN_PRODUCTION_MESSAGE,
  RESET_DEMO_CONFIRM_REQUIRED_MESSAGE,
} from '../prisma/seed/reset-demo-guards';

describe('runDemoReset', () => {
  it('bloqueia production mesmo com --confirm', async () => {
    const prisma = {} as never;

    await expect(
      runDemoReset(prisma, {
        nodeEnv: 'production',
        argv: ['--confirm'],
      }),
    ).rejects.toThrow(RESET_DEMO_BLOCKED_IN_PRODUCTION_MESSAGE);
  });

  it('exige --confirm fora de production', async () => {
    const prisma = {} as never;

    await expect(
      runDemoReset(prisma, {
        nodeEnv: 'test',
        argv: [],
      }),
    ).rejects.toThrow(RESET_DEMO_CONFIRM_REQUIRED_MESSAGE);
  });
});
