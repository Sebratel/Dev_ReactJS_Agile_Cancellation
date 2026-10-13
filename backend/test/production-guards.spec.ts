import { HttpStatus } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { getAppConfig, parseTrustProxy } from '@/config/app.config';
import { getGoogleAuthConfig } from '@/config/google-auth.config';
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

describe('B6 — login mock/dev impossivel em producao', () => {
  it('GOOGLE_AUTH_MODE=mock com NODE_ENV=production falha o boot', () => {
    expect(() =>
      getGoogleAuthConfig({ ...PROD, GOOGLE_AUTH_MODE: 'mock' }),
    ).toThrow(/mock nao e permitido em producao/);
  });

  it('producao sem GOOGLE_CLIENT_ID falha (nao cai no verificador mock)', () => {
    expect(() =>
      getGoogleAuthConfig({ ...PROD, GOOGLE_CLIENT_ID: '' }),
    ).toThrow(/GOOGLE_CLIENT_ID/);
    expect(() =>
      getGoogleAuthConfig({
        ...PROD,
        GOOGLE_CLIENT_ID: '',
        GOOGLE_AUTH_MODE: 'auto',
      }),
    ).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it('fora de producao o mock continua disponivel', () => {
    expect(
      getGoogleAuthConfig({ NODE_ENV: 'development', GOOGLE_AUTH_MODE: 'mock' })
        .mode,
    ).toBe('mock');
  });

  describe('verificador e sessoes de dev', () => {
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

    it('createGoogleTokenVerifier nunca devolve o mock em producao', () => {
      Object.assign(process.env, PROD, { GOOGLE_AUTH_MODE: 'auto' });

      expect(createGoogleTokenVerifier(mockVerifier, realVerifier)).toBe(
        realVerifier,
      );

      process.env.GOOGLE_AUTH_MODE = 'mock';
      expect(() =>
        createGoogleTokenVerifier(mockVerifier, realVerifier),
      ).toThrow();
    });

    function createAuthService() {
      const findById = jest.fn().mockResolvedValue(null);
      const findByEmail = jest.fn().mockResolvedValue(null);
      const service = new AuthService(
        { findById, findByEmail } as unknown as AuthRepository,
        {} as never,
        { signAsync: jest.fn() } as unknown as JwtService,
      );

      return { service, findById, findByEmail };
    }

    it('dev-login responde 403 em producao', async () => {
      Object.assign(process.env, PROD);
      const { service } = createAuthService();

      await expect(service.devLogin('admin@ger.local')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('token de sessao dev e ignorado em producao, mesmo com GOOGLE_AUTH_MODE=mock', async () => {
      Object.assign(process.env, PROD, { GOOGLE_AUTH_MODE: 'mock' });
      const { service, findById, findByEmail } = createAuthService();

      const user = await service.validateJwtPayload({
        sub: 'usr_admin',
        email: 'admin@ger.local',
        roles: ['ADMIN'],
        devSession: true,
      });

      expect(user).toBeNull();
      expect(findByEmail).not.toHaveBeenCalled();
      expect(findById).toHaveBeenCalledWith('usr_admin');
    });

    it('refresh "dev:" nao e aceito em producao com GOOGLE_AUTH_MODE=mock', async () => {
      Object.assign(process.env, PROD, { GOOGLE_AUTH_MODE: 'mock' });
      const { service, findById } = createAuthService();

      await expect(
        service.refresh({ refreshToken: 'dev:usr_admin' }),
      ).rejects.toBeDefined();
      expect(findById).not.toHaveBeenCalledWith('usr_admin');
    });
  });
});
