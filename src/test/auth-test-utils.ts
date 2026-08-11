import { type AuthSession } from '@/types/auth';
import { TEST_ACCESS_TOKEN, TEST_REFRESH_TOKEN } from '@/test/test-credentials';

export function createMockSession(
  overrides?: Partial<AuthSession>,
): AuthSession {
  return {
    accessToken: TEST_ACCESS_TOKEN,
    refreshToken: TEST_REFRESH_TOKEN,
    user: {
      id: 'session-user',
      name: 'Ana Martins',
      email: 'admin@ger.local',
      roles: ['ADMIN'],
      role: 'ADMIN',
    },
    ...overrides,
  };
}
