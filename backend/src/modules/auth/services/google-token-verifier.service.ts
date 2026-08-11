import { HttpStatus, Injectable } from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { getGoogleAuthConfig } from '@/config/google-auth.config';
import { AppException } from '@/common/exceptions/app.exception';
import type {
  GoogleTokenVerifier,
  GoogleVerifiedPayload,
} from '@/modules/auth/services/google-token-verifier';

@Injectable()
export class GoogleTokenVerifierService implements GoogleTokenVerifier {
  private readonly client: OAuth2Client;
  private readonly config = getGoogleAuthConfig();

  constructor() {
    this.client = new OAuth2Client(this.config.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleVerifiedPayload> {
    if (!this.config.clientId) {
      throw new AppException(
        'Login com Google não está configurado no servidor.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.config.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AppException(
        'Token do Google inválido ou expirado.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!payload?.email || !payload.email_verified) {
      throw new AppException(
        'Não foi possível verificar o e-mail da conta Google.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const email = payload.email.trim().toLowerCase();
    const domain = email.split('@')[1];

    if (
      domain !== this.config.workspaceDomain ||
      payload.hd !== this.config.workspaceDomain
    ) {
      throw new AppException(
        `Apenas contas do domínio @${this.config.workspaceDomain} podem acessar a plataforma.`,
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      email,
      name: payload.name ?? email,
      picture: payload.picture ?? null,
    };
  }
}
