import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { HttpStatus } from '@nestjs/common';
import { mapPrismaRoles } from '@/modules/auth/repositories/auth-mock.repository';
import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';
import type {
  CreateUserData,
  ListUsersParams,
  ListUsersResult,
  UpdateUserData,
  UserRecord,
  UsersRepository,
} from '@/modules/users/repositories/users.repository';

type PrismaUserWithRoles = {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userRoles: Array<{ role: { code: string } }>;
};

@Injectable()
export class UsersPrismaRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userInclude = {
    userRoles: { include: { role: true } },
  } as const;

  private mapUser(user: PrismaUserWithRoles): UserRecord {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: mapPrismaRoles(user.userRoles.map((ur) => ur.role.code)),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    const where: Prisma.UserWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.role) {
      where.userRoles = { some: { role: { code: params.role } } };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: this.userInclude,
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapUser(item)),
      total,
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: this.userInclude,
    });

    return user ? this.mapUser(user) : null;
  }

  private async resolveRoleIds(roleCodes: RoleCode[]): Promise<string[]> {
    const roles = await this.prisma.role.findMany({
      where: { code: { in: roleCodes } },
      select: { id: true, code: true },
    });

    if (roles.length !== roleCodes.length) {
      const found = new Set(roles.map((role) => role.code));
      const missing = roleCodes.filter((code) => !found.has(code));

      throw new AppException(
        `Papéis não encontrados: ${missing.join(', ')}.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return roles.map((role) => role.id);
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const roleIds = await this.resolveRoleIds(data.roleCodes);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        name: data.name,
        status: data.status,
        userRoles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: this.userInclude,
    });

    return this.mapUser(user);
  }

  async update(id: string, data: UpdateUserData): Promise<UserRecord | null> {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const roleIds = data.roleCodes
      ? await this.resolveRoleIds(data.roleCodes)
      : null;

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: data.name ?? undefined,
          status: data.status ?? undefined,
        },
      });

      if (roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }

      return tx.user.findUnique({
        where: { id },
        include: this.userInclude,
      });
    });

    return user ? this.mapUser(user) : null;
  }

  async countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        userRoles: { some: { role: { code: 'ADMIN' } } },
      },
    });
  }
}
