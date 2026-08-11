import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { MOCK_AUTH_USER_DEFINITIONS } from '@/modules/auth/mocks/mock-auth-users';
import {
  AUTH_REPOSITORY,
  GOOGLE_TOKEN_VERIFIER,
} from '@/common/data-source/data-source.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import type { GoogleLoginDto } from '@/modules/auth/dto/google-login.dto';
import type { LogoutDto } from '@/modules/auth/dto/logout.dto';
import type { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto';
import type {
  AuthUserResponse,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from '@/modules/auth/dto/auth.response';
import type { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import type { GoogleTokenVerifier } from '@/modules/auth/services/google-token-verifier';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '@/modules/auth/types/authenticated-user.type';
import {
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshToken,
  verifyRefreshToken,
} from '@/modules/auth/utils/refresh-token.util';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,
    @Inject(GOOGLE_TOKEN_VERIFIER)
    private readonly googleTokenVerifier: GoogleTokenVerifier,
    private readonly jwtService: JwtService,
  ) {}

  async devLogin(email: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppException('Não disponível em produção.', HttpStatus.FORBIDDEN);
    }

    // Tenta usuario mock primeiro; se nao encontrar, busca no banco real
    const mockDef = MOCK_AUTH_USER_DEFINITIONS.find(
      (u) => u.email === email && u.status === 'ACTIVE',
    );

    let authenticatedUser: AuthenticatedUser;

    if (mockDef) {
      authenticatedUser = {
        id: mockDef.id,
        email: mockDef.email,
        name: mockDef.name,
        roles: mockDef.roleCodes,
      };
    } else {
      const dbUser = await this.authRepository.findByEmail(email);

      if (!dbUser) {
        throw new AppException(
          `Usuário "${email}" não encontrado.`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (dbUser.status !== UserStatus.ACTIVE) {
        throw new AppException('Usuário inativo ou bloqueado.', HttpStatus.UNAUTHORIZED);
      }

      authenticatedUser = this.toAuthenticatedUser(dbUser);
    }

    const payload: JwtPayload = {
      sub: authenticatedUser.id,
      email: authenticatedUser.email,
      roles: authenticatedUser.roles,
      devSession: true,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '8h',
    });

    const response: LoginResponse = {
      accessToken,
      refreshToken: `dev:${authenticatedUser.id}`,
      user: this.toAuthUserResponse(authenticatedUser),
    };

    return createApiResponse(response);
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    const googlePayload = await this.googleTokenVerifier.verifyIdToken(
      dto.idToken,
    );
    const user = await this.authRepository.findByEmail(googlePayload.email);

    if (!user) {
      throw new AppException(
        'Seu e-mail não está cadastrado na plataforma. Solicite acesso a um administrador.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        'Usuário inativo ou bloqueado.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const authenticatedUser = this.toAuthenticatedUser(user);
    const tokens = await this.issueAuthTokens(authenticatedUser);
    const lastLoginAt = new Date();

    await this.authRepository.updateLastLogin(user.id, lastLoginAt);

    const response: LoginResponse = {
      ...tokens,
      user: this.toAuthUserResponse(authenticatedUser),
    };

    return createApiResponse(response);
  }

  async refresh(dto: RefreshTokenDto) {
    if (dto.refreshToken.startsWith('dev:') && process.env.NODE_ENV !== 'production') {
      const userId = dto.refreshToken.slice(4);

      const mockUser = MOCK_AUTH_USER_DEFINITIONS.find(
        (u) => u.id === userId && u.status === 'ACTIVE',
      );

      const devUser: AuthenticatedUser | null = mockUser
        ? { id: mockUser.id, email: mockUser.email, name: mockUser.name, roles: mockUser.roleCodes }
        : await this.authRepository.findById(userId).then((u) =>
            u && u.status === UserStatus.ACTIVE ? this.toAuthenticatedUser(u) : null,
          );

      if (devUser) {
        const payload: JwtPayload = {
          sub: devUser.id,
          email: devUser.email,
          roles: devUser.roles,
          devSession: true,
        };
        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '8h' });
        return createApiResponse<RefreshResponse>({ accessToken, refreshToken: dto.refreshToken });
      }
    }

    const authenticatedUser = await this.validateRefreshToken(dto.refreshToken);

    if (!authenticatedUser) {
      throw new AppException(
        'Refresh token inválido ou expirado.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.issueAuthTokens(authenticatedUser);
    const response: RefreshResponse = tokens;

    return createApiResponse(response);
  }

  async logout(dto: LogoutDto, authorization?: string) {
    const userId = await this.resolveLogoutUserId(dto, authorization);

    if (userId) {
      await this.authRepository.updateRefreshTokenHash(userId, null);
    }

    const response: LogoutResponse = { success: true };
    return createApiResponse(response);
  }

  me(user: AuthenticatedUser) {
    return createApiResponse(this.toAuthUserResponse(user));
  }

  async validateJwtPayload(
    payload: JwtPayload,
  ): Promise<AuthenticatedUser | null> {
    if (payload.devSession && process.env.NODE_ENV !== 'production') {
      const mockUser = MOCK_AUTH_USER_DEFINITIONS.find(
        (u) => u.id === payload.sub && u.status === 'ACTIVE',
      );
      if (mockUser) {
        return { id: mockUser.id, email: mockUser.email, name: mockUser.name, roles: mockUser.roleCodes };
      }
      // Usuario real com token dev — cai no lookup normal abaixo
    }

    const user = await this.authRepository.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }

    return this.toAuthenticatedUser(user);
  }

  private async issueAuthTokens(user: AuthenticatedUser) {
    const accessToken = await this.createAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    const refreshTokenHash = await hashRefreshToken(refreshToken);

    await this.authRepository.updateRefreshTokenHash(user.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async validateRefreshToken(
    refreshToken: string,
  ): Promise<AuthenticatedUser | null> {
    const parsed = parseRefreshToken(refreshToken);

    if (!parsed) {
      return null;
    }

    const user = await this.authRepository.findById(parsed.userId);

    if (!user || user.status !== UserStatus.ACTIVE || !user.refreshTokenHash) {
      return null;
    }

    const isValid = await verifyRefreshToken(
      user.refreshTokenHash,
      refreshToken,
    );

    if (!isValid) {
      return null;
    }

    return this.toAuthenticatedUser(user);
  }

  private async resolveLogoutUserId(
    dto: LogoutDto,
    authorization?: string,
  ): Promise<string | null> {
    if (dto.refreshToken) {
      const authenticatedUser = await this.validateRefreshToken(
        dto.refreshToken,
      );

      if (authenticatedUser) {
        return authenticatedUser.id;
      }
    }

    if (authorization?.startsWith('Bearer ')) {
      const accessToken = authorization.slice('Bearer '.length).trim();

      try {
        const payload =
          await this.jwtService.verifyAsync<JwtPayload>(accessToken);
        return payload.sub;
      } catch {
        return null;
      }
    }

    return null;
  }

  private async createAccessToken(user: AuthenticatedUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    return this.jwtService.signAsync(payload);
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    name: string;
    roles: AuthenticatedUser['roles'];
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    };
  }

  private toAuthUserResponse(user: AuthenticatedUser): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    };
  }
}
