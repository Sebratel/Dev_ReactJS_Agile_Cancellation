import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { mapPrismaRoles } from '@/modules/auth/repositories/auth-mock.repository';
import type {
  AuthRepository,
  AuthUserRecord,
} from '@/modules/auth/repositories/auth.repository';

@Injectable()
export class AuthPrismaRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapUser(user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
    status: AuthUserRecord['status'];
    refreshTokenHash: string | null;
    userRoles: Array<{ role: { code: string } }>;
  }): AuthUserRecord {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      refreshTokenHash: user.refreshTokenHash,
      roles: mapPrismaRoles(
        user.userRoles.map((userRole) => userRole.role.code),
      ),
    };
  }

  private readonly userInclude = {
    userRoles: {
      include: {
        role: true,
      },
    },
  } as const;

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: this.userInclude,
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude,
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async updateLastLogin(userId: string, lastLoginAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt },
    });
  }

  async updateGoogleProfile(
    userId: string,
    profile: { name?: string; avatarUrl?: string | null },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: profile.name ?? undefined,
        avatarUrl: profile.avatarUrl ?? undefined,
      },
    });
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }
}
