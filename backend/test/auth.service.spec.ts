import { HttpStatus } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AppException } from '@/common/exceptions/app.exception';
import { AuthService } from '@/modules/auth/auth.service';
import type {
  AuthRepository,
  AuthUserRecord,
} from '@/modules/auth/repositories/auth.repository';

jest.mock('@/modules/auth/utils/refresh-token.util', () => ({
  generateRefreshToken: jest.fn((userId: string) => `${userId}:segredo`),
  hashRefreshToken: jest.fn((token: string) =>
    Promise.resolve(`hash(${token})`),
  ),
  parseRefreshToken: jest.fn((token: string) => {
    const index = token.indexOf(':');
    return index > 0
      ? { userId: token.slice(0, index), secret: token.slice(index + 1) }
      : null;
  }),
  verifyRefreshToken: jest.fn((hash: string, token: string) =>
    Promise.resolve(hash === `hash(${token})`),
  ),
}));

function dbUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: 'db-1',
    email: 'real@sebratel.com.br',
    name: 'Usuario Real',
    avatarUrl: null,
    status: 'ACTIVE',
    refreshTokenHash: 'hash(db-1:segredo)',
    roles: ['COLLECTION_AGENT'],
    ...overrides,
  };
}

async function expectAppException(
  promise: Promise<unknown>,
  status: HttpStatus,
) {
  const error: unknown = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).getStatus()).toBe(status);
}

describe('AuthService', () => {
  const original = { ...process.env };
  let repository: {
    [K in keyof AuthRepository]: jest.Mock;
  };
  let verifier: { verifyIdToken: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.GOOGLE_AUTH_MODE = 'mock';
    repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
      updateGoogleProfile: jest.fn().mockResolvedValue(undefined),
      updateRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
    };
    verifier = {
      verifyIdToken: jest.fn().mockResolvedValue({
        email: 'admin@ger.local',
        name: 'Nome Google',
        picture: 'http://avatar',
      }),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-jwt' }),
    };
    service = new AuthService(
      repository,
      verifier,
      jwt as unknown as JwtService,
    );
  });

  afterEach(() => {
    process.env = { ...original };
  });

  describe('devLogin', () => {
    it('autentica usuario mock ativo', async () => {
      const result = await service.devLogin('admin@ger.local');
      expect(result.data.accessToken).toBe('jwt-token');
      expect(result.data.refreshToken).toBe('dev:user-admin');
      expect(result.data.user.roles).toEqual(['ADMIN']);
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ devSession: true }),
        { expiresIn: '8h' },
      );
    });

    it('autentica usuario do banco quando nao ha mock', async () => {
      repository.findByEmail.mockResolvedValue(dbUser());
      const result = await service.devLogin('real@sebratel.com.br');
      expect(result.data.refreshToken).toBe('dev:db-1');
    });

    it('rejeita usuario inexistente (404) e inativo (401)', async () => {
      await expectAppException(
        service.devLogin('ninguem@x.com'),
        HttpStatus.NOT_FOUND,
      );
      repository.findByEmail.mockResolvedValue(dbUser({ status: 'INACTIVE' }));
      await expectAppException(
        service.devLogin('real@sebratel.com.br'),
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('loginWithGoogle (modo mock)', () => {
    it('usa o usuario do banco quando ativo e emite tokens reais', async () => {
      repository.findByEmail.mockResolvedValue(dbUser());
      const result = await service.loginWithGoogle({ idToken: 'tok' });
      expect(result.data.refreshToken).toBe('db-1:segredo');
      expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
        'db-1',
        'hash(db-1:segredo)',
      );
    });

    it('cai no usuario mock quando o banco falha ou nao encontra', async () => {
      repository.findByEmail.mockRejectedValue(new Error('db fora'));
      const result = await service.loginWithGoogle({ idToken: 'tok' });
      expect(result.data.refreshToken).toBe('dev:user-admin');
    });

    it('rejeita e-mail fora da lista (403) e usuario mock inativo (401)', async () => {
      verifier.verifyIdToken.mockResolvedValue({
        email: 'desconhecido@x.com',
        name: 'X',
      });
      await expectAppException(
        service.loginWithGoogle({ idToken: 'tok' }),
        HttpStatus.FORBIDDEN,
      );

      verifier.verifyIdToken.mockResolvedValue({
        email: 'inactive@ger.local',
        name: 'X',
      });
      await expectAppException(
        service.loginWithGoogle({ idToken: 'tok' }),
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('loginWithGoogle (modo real)', () => {
    beforeEach(() => {
      process.env.GOOGLE_AUTH_MODE = 'real';
    });

    it('rejeita e-mail nao cadastrado (403) e usuario inativo (401)', async () => {
      await expectAppException(
        service.loginWithGoogle({ idToken: 'tok' }),
        HttpStatus.FORBIDDEN,
      );
      repository.findByEmail.mockResolvedValue(dbUser({ status: 'BLOCKED' }));
      await expectAppException(
        service.loginWithGoogle({ idToken: 'tok' }),
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('autentica, atualiza ultimo login e perfil do Google', async () => {
      repository.findByEmail.mockResolvedValue(dbUser());
      const result = await service.loginWithGoogle({ idToken: 'tok' });
      expect(repository.updateLastLogin).toHaveBeenCalledWith(
        'db-1',
        expect.any(Date),
      );
      expect(repository.updateGoogleProfile).toHaveBeenCalledWith('db-1', {
        name: 'Nome Google',
        avatarUrl: 'http://avatar',
      });
      expect(result.data.user.name).toBe('Nome Google');
      expect(result.data.user.avatarUrl).toBe('http://avatar');
    });

    it('mantem o avatar atual quando o Google nao envia foto', async () => {
      verifier.verifyIdToken.mockResolvedValue({
        email: 'real@sebratel.com.br',
        name: 'N',
      });
      repository.findByEmail.mockResolvedValue(
        dbUser({ avatarUrl: 'http://antigo' }),
      );
      const result = await service.loginWithGoogle({ idToken: 'tok' });
      expect(result.data.user.avatarUrl).toBe('http://antigo');
    });
  });

  describe('refresh', () => {
    it('renova sessao dev de usuario mock', async () => {
      const result = await service.refresh({ refreshToken: 'dev:user-admin' });
      expect(result.data).toEqual({
        accessToken: 'jwt-token',
        refreshToken: 'dev:user-admin',
      });
    });

    it('renova sessao dev de usuario do banco ativo', async () => {
      repository.findById.mockResolvedValue(dbUser());
      const result = await service.refresh({ refreshToken: 'dev:db-1' });
      expect(result.data.refreshToken).toBe('dev:db-1');
    });

    it('sessao dev invalida cai na validacao normal e falha', async () => {
      repository.findById.mockResolvedValue(dbUser({ status: 'INACTIVE' }));
      await expectAppException(
        service.refresh({ refreshToken: 'dev:db-1' }),
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('rotaciona o refresh token valido', async () => {
      repository.findById.mockResolvedValue(dbUser());
      const result = await service.refresh({ refreshToken: 'db-1:segredo' });
      expect(result.data.accessToken).toBe('jwt-token');
      expect(repository.updateRefreshTokenHash).toHaveBeenCalled();
    });

    it.each([
      ['formato invalido', 'semseparador', null],
      ['usuario inexistente', 'db-1:segredo', null],
      ['usuario inativo', 'db-1:segredo', dbUser({ status: 'INACTIVE' })],
      ['sem hash gravado', 'db-1:segredo', dbUser({ refreshTokenHash: null })],
      ['hash divergente', 'db-1:outro', dbUser()],
    ])('rejeita refresh token com %s', async (_nome, token, user) => {
      repository.findById.mockResolvedValue(user);
      await expectAppException(
        service.refresh({ refreshToken: token }),
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('nao trata prefixo dev: como sessao dev fora do ambiente permitido', async () => {
      process.env.NODE_ENV = 'production';
      await expectAppException(
        service.refresh({ refreshToken: 'dev:user-admin' }),
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('logout', () => {
    it('revoga o hash quando o refresh token e valido', async () => {
      repository.findById.mockResolvedValue(dbUser());
      const result = await service.logout({ refreshToken: 'db-1:segredo' });
      expect(result.data).toEqual({ success: true });
      expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
        'db-1',
        null,
      );
    });

    it('usa o bearer token quando nao ha refresh token valido', async () => {
      await service.logout({}, 'Bearer abc');
      expect(jwt.verifyAsync).toHaveBeenCalledWith('abc');
      expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
        'user-jwt',
        null,
      );
    });

    it('nao revoga nada quando o bearer e invalido ou ausente', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('expirado'));
      await service.logout({ refreshToken: 'semseparador' }, 'Bearer ruim');
      await service.logout({}, 'Basic xyz');
      await service.logout({});
      expect(repository.updateRefreshTokenHash).not.toHaveBeenCalled();
    });
  });

  describe('me e validateJwtPayload', () => {
    it('devolve o usuario autenticado', () => {
      const user = {
        id: 'u',
        email: 'e@x.com',
        name: 'N',
        avatarUrl: null,
        roles: ['ADMIN' as const],
      };
      expect(service.me(user).data).toEqual(user);
    });

    it('sessao dev prioriza o usuario do banco ativo', async () => {
      repository.findByEmail.mockResolvedValue(dbUser());
      const user = await service.validateJwtPayload({
        sub: 'x',
        email: 'real@sebratel.com.br',
        roles: [],
        devSession: true,
      });
      expect(user?.id).toBe('db-1');
    });

    it('sessao dev cai no usuario mock quando o banco falha', async () => {
      repository.findByEmail.mockRejectedValue(new Error('fora'));
      const user = await service.validateJwtPayload({
        sub: 'user-admin',
        email: 'admin@ger.local',
        roles: ['ADMIN'],
        devSession: true,
      });
      expect(user?.id).toBe('user-admin');
    });

    it('sessao dev sem mock nem banco usa o lookup normal por id', async () => {
      repository.findById.mockResolvedValue(dbUser());
      const user = await service.validateJwtPayload({
        sub: 'db-1',
        email: 'sumiu@x.com',
        roles: [],
        devSession: true,
      });
      expect(user?.id).toBe('db-1');
    });

    it('token normal exige usuario ativo', async () => {
      await expect(
        service.validateJwtPayload({ sub: 'x', email: 'e', roles: [] }),
      ).resolves.toBeNull();
      repository.findById.mockResolvedValue(dbUser({ status: 'INACTIVE' }));
      await expect(
        service.validateJwtPayload({ sub: 'db-1', email: 'e', roles: [] }),
      ).resolves.toBeNull();
      repository.findById.mockResolvedValue(dbUser());
      await expect(
        service.validateJwtPayload({ sub: 'db-1', email: 'e', roles: [] }),
      ).resolves.toEqual(expect.objectContaining({ id: 'db-1' }));
    });
  });
});
