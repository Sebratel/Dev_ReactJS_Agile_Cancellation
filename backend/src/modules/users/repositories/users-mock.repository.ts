import { Injectable, OnModuleInit } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { MOCK_AUTH_USER_DEFINITIONS } from '@/modules/auth/mocks/mock-auth-users';
import type {
  CreateUserData,
  ListUsersParams,
  ListUsersResult,
  UpdateUserData,
  UserRecord,
  UsersRepository,
} from '@/modules/users/repositories/users.repository';

@Injectable()
export class UsersMockRepository implements UsersRepository, OnModuleInit {
  private readonly users = new Map<string, UserRecord>();
  private sequence = 0;
  private readonly baseDate = new Date('2025-01-01T00:00:00.000Z');

  onModuleInit(): void {
    if (getDataSourceMode() !== 'mock') {
      return;
    }

    this.users.clear();

    for (const definition of MOCK_AUTH_USER_DEFINITIONS) {
      this.users.set(definition.id, {
        id: definition.id,
        email: definition.email.toLowerCase(),
        name: definition.name,
        avatarUrl: null,
        status: definition.status,
        roles: definition.roleCodes,
        lastLoginAt: null,
        createdAt: this.baseDate,
        updatedAt: this.baseDate,
      });
    }
  }

  list(params: ListUsersParams): Promise<ListUsersResult> {
    let items = Array.from(this.users.values());

    if (params.status) {
      items = items.filter((user) => user.status === params.status);
    }

    if (params.role) {
      items = items.filter((user) => user.roles.includes(params.role!));
    }

    if (params.search) {
      const term = params.search.trim().toLowerCase();
      items = items.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term),
      );
    }

    items.sort((a, b) => a.name.localeCompare(b.name));

    const total = items.length;
    const start = (params.page - 1) * params.limit;
    const paged = items.slice(start, start + params.limit);

    return Promise.resolve({ items: paged, total });
  }

  findById(id: string): Promise<UserRecord | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const found = Array.from(this.users.values()).find(
      (user) => user.email === normalized,
    );

    return Promise.resolve(found ?? null);
  }

  create(data: CreateUserData): Promise<UserRecord> {
    this.sequence += 1;
    const id = `user-mock-${this.sequence}`;
    const record: UserRecord = {
      id,
      email: data.email.trim().toLowerCase(),
      name: data.name,
      avatarUrl: null,
      status: data.status,
      roles: data.roleCodes,
      lastLoginAt: null,
      createdAt: this.baseDate,
      updatedAt: this.baseDate,
    };

    this.users.set(id, record);

    return Promise.resolve(record);
  }

  update(id: string, data: UpdateUserData): Promise<UserRecord | null> {
    const existing = this.users.get(id);

    if (!existing) {
      return Promise.resolve(null);
    }

    const updated: UserRecord = {
      ...existing,
      name: data.name ?? existing.name,
      status: data.status ?? existing.status,
      roles: data.roleCodes ?? existing.roles,
    };

    this.users.set(id, updated);

    return Promise.resolve(updated);
  }

  countActiveAdmins(): Promise<number> {
    const count = Array.from(this.users.values()).filter(
      (user) =>
        user.status === UserStatus.ACTIVE && user.roles.includes('ADMIN'),
    ).length;

    return Promise.resolve(count);
  }
}
