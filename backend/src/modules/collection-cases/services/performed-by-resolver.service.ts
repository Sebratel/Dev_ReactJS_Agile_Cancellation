import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { MOCK_AUTH_USER_DEFINITIONS } from '@/modules/auth/mocks/mock-auth-users';

const MOCK_USER_IDS = new Set(MOCK_AUTH_USER_DEFINITIONS.map((u) => u.id));

@Injectable()
export class PerformedByResolverService {
  resolve(authenticatedUserId?: string): string | null {
    if (!authenticatedUserId) {
      throw new AppException(
        'Usuário autenticado obrigatório.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Usuarios mock nao existem no banco real — retorna null para nao violar FK
    if (MOCK_USER_IDS.has(authenticatedUserId)) {
      return null;
    }

    return authenticatedUserId;
  }
}
