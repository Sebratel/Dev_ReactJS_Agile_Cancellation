import { HttpStatus } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { getAppConfig, parseTrustProxy } from '@/config/app.config';
import { getGoogleAuthConfig } from '@/config/google-auth.config';
import { isDevLoginEnabled } from '@/modules/auth/utils/dev-login.util';
import { AuthService } from '@/modules/auth/auth.service';
import { createGoogleTokenVerifier } from '@/modules/auth/repositories/google-token-verifier.factory';
import type { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import type { GoogleTokenVerifierMockService } from '@/modules/auth/services/google-token-verifier.mock.service';
import type { GoogleTokenVerifierService } from '@/modules/auth/services/google-token-verifier.service';

const PROD = {
  NODE_ENV: 'production',
  CORS_ORIGIN: 'https://cancelamento.exemplo.com.br',
  GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
} as NodeJS.ProcessEnv;

describe('B5 — trust proxy (limite por IP atras do nginx)', () => {
  it('producao confia em 1 hop por padrao; fora dela nao confia', () => {
    expect(getAppConfig(PROD).trustProxy).toBe(1);
    expect(getAppConfig({ NODE_ENV: 'development' }).trustProxy).toBe(false);
  });

  it('TRUST_PROXY aceita hops, booleano e lista de IPs', () => {
    expect(parseTrustProxy('2', true)).toBe(2);
    expect(parseTrustProxy('false', true)).toBe(false);
    expect(parseTrustProxy('true', false)).toBe(true);
    expect(parseTrustProxy('10.0.0.0/8', false)).toBe('10.0.0.0/8');
  });
});

describe('S1/B6 — dev-login, sessoes dev e mock Google (lista de permissao)', () => {
  const original = { ...process.env };
  const mockVerifier = {
    kind: 'mock',
  } as unknown as GoogleTokenVerifierMockService;
  const realVerifier = {
    kind: 'real',
  } as unknown as GoogleTokenVerifierService;

  afterEach(() => {
    process.env = { ...original };
  });

  function setEnv(nodeEnv: string | undefined, flag?: string) {
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
    if (flag === undefined) delete process.env.ENABLE_DEV_LOGIN;
    else process.env.ENABLE_DEV_LOGIN = flag;
    process.env.GOOGLE_AUTH_MODE = 'mock';
    process.env.GOOGLE_CLIENT_ID = '';
  }

  function createAuthService() {
    const findById = jest.fn().mockResolvedValue(null);
    const findByEmail = jest.fn().mockResolvedValue(null);
    const service = new AuthService(
      { findById, findByEmail } as unknown as AuthRepository,
      {} as never,
      {
        signAsync: jest.fn().mockResolvedValue('jwt'),
      } as unknown as JwtService,
    );

    return { service, findById, findByEmail };
  }

  it('isDevLoginEnabled: so development/test COM a flag', () => {
    expect(
      isDevLoginEnabled({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'true' }),
    ).toBe(true);
    expect(
      isDevLoginEnabled({ NODE_ENV: 'test', ENABLE_DEV_LOGIN: 'true' }),
    ).toBe(true);
    expect(isDevLoginEnabled({ NODE_ENV: 'development' })).toBe(false);
    expect(
      isDevLoginEnabled({ NODE_ENV: 'development', ENABLE_DEV_LOGIN: 'false' }),
    ).toBe(false);
    for (const nodeEnv of ['staging', 'production', 'prod', '', undefined]) {
      expect(
        isDevLoginEnabled({ NODE_ENV: nodeEnv, ENABLE_DEV_LOGIN: 'true' }),
      ).toBe(false);
    }
  });

  it('config do Google nao falha o boot (so desliga o mock)', () => {
    expect(() =>
      getGoogleAuthConfig({ ...PROD, GOOGLE_AUTH_MODE: 'mock' }),
    ).not.toThrow();
    expect(() =>
      getGoogleAuthConfig({
        ...PROD,
        GOOGLE_CLIENT_ID: '',
        GOOGLE_AUTH_MODE: 'auto',
      }),
    ).not.toThrow();
  });

  describe.each(['staging', 'production', undefined])(
    'NODE_ENV=%s com flag ligada',
    (nodeEnv) => {
      it('verificador e sempre o real, mesmo com GOOGLE_AUTH_MODE=mock', () => {
        setEnv(nodeEnv, 'true');
        expect(createGoogleTokenVerifier(mockVerifier, realVerifier)).toBe(
          realVerifier,
        );
      });

      it('dev-login negado (403)', async () => {
        setEnv(nodeEnv, 'true');
        await expect(
          createAuthService().service.devLogin('admin@ger.local'),
        ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      });

      it('devSession ignorada e refresh "dev:" rejeitado', async () => {
        setEnv(nodeEnv, 'true');
        const { service, findById, findByEmail } = createAuthService();

        expect(
          await service.validateJwtPayload({
            sub: 'usr_admin',
            email: 'admin@ger.local',
            roles: ['ADMIN'],
            devSession: true,
          }),
        ).toBeNull();
        expect(findByEmail).not.toHaveBeenCalled();
        expect(findById).toHaveBeenCalledWith('usr_admin');

        await expect(
          service.refresh({ refreshToken: 'dev:usr_admin' }),
        ).rejects.toBeDefined();
      });
    },
  );

  it('development SEM flag: tudo negado', async () => {
    setEnv('development', undefined);
    expect(createGoogleTokenVerifier(mockVerifier, realVerifier)).toBe(
      realVerifier,
    );
    await expect(
      createAuthService().service.devLogin('admin@ger.local'),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
  });

  it('development + flag: mock e dev-login permitidos', async () => {
    setEnv('development', 'true');
    expect(createGoogleTokenVerifier(mockVerifier, realVerifier)).toBe(
      mockVerifier,
    );

    const { service } = createAuthService();
    const response = await service.devLogin('admin@ger.local');
    expect(response.data.accessToken).toBe('jwt');
  });
});
