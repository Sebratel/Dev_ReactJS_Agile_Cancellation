import { Injectable, OnModuleInit } from '@nestjs/common';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { isRoleCode } from '@/modules/auth/constants/role-codes.constants';
import { MOCK_AUTH_USER_DEFINITIONS } from '@/modules/auth/mocks/mock-auth-users';
import type {
  AuthRepository,
  AuthUserRecord,
} from '@/modules/auth/repositories/auth.repository';

@Injectable()
export class AuthMockRepository implements AuthRepository, OnModuleInit {
  private readonly users = new Map<string, AuthUserRecord>();
  private ready = false;

  onModuleInit(): void {
    if (getDataSourceMode() !== 'mock') {
      return;
    }

    this.initializeUsers();
  }

  private initializeUsers(): void {
    for (const definition of MOCK_AUTH_USER_DEFINITIONS) {
      const record: AuthUserRecord = {
        id: definition.id,
        email: definition.email.toLowerCase(),
        name: definition.name,
        status: definition.status,
        refreshTokenHash: null,
        roles: definition.roleCodes,
      };

      this.users.set(record.email, record);
      this.users.set(record.id, record);
    }

    this.ready = true;
  }

  private ensureReady() {
    if (!this.ready) {
      throw new Error(
        'Repositorio mock de autenticacao ainda nao inicializado.',
      );
    }
  }

  private syncUserRecord(record: AuthUserRecord) {
    this.users.set(record.id, record);
    this.users.set(record.email, record);
  }

  findByEmail(email: string): Promise<AuthUserRecord | null> {
    this.ensureReady();
    return Promise.resolve(this.users.get(email.trim().toLowerCase()) ?? null);
  }

  findById(id: string): Promise<AuthUserRecord | null> {
    this.ensureReady();
    return Promise.resolve(this.users.get(id) ?? null);
  }

  updateLastLogin(userId: string, lastLoginAt: Date): Promise<void> {
    this.ensureReady();
    const user = this.users.get(userId);

    if (!user) {
      return Promise.resolve();
    }

    void lastLoginAt;
    this.syncUserRecord({ ...user });
    return Promise.resolve();
  }

  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    this.ensureReady();
    const user = this.users.get(userId);

    if (!user) {
      return Promise.resolve();
    }

    this.syncUserRecord({
      ...user,
      refreshTokenHash,
    });

    return Promise.resolve();
  }
}

export function mapPrismaRoles(roleCodes: string[]) {
  return roleCodes.filter(isRoleCode);
}
