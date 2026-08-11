import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma/prisma.service';
import { USERS_REPOSITORY } from '@/common/data-source/data-source.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import { createPaginatedResponse } from '@/common/pagination/paginated-response';
import type { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import type { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import type { UsersQueryDto } from '@/modules/users/dto/users-query.dto';
import { toUserResponse } from '@/modules/users/dto/user.response';
import type {
  UserRecord,
  UsersRepository,
} from '@/modules/users/repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(query: UsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.usersRepository.list({
      page,
      limit,
      status: query.status,
      role: query.role,
      search: query.search,
    });

    return createApiResponse(
      createPaginatedResponse(items.map(toUserResponse), page, limit, total),
    );
  }

  async getById(id: string) {
    const user = await this.requireUser(id);
    return createApiResponse(toUserResponse(user));
  }

  /**
   * Carga de trabalho (contagem de casos ativos) por agente, usada na
   * distribuicao manual/automatica para evitar sobrecarregar um agente.
   */
  async getWorkload() {
    const ACTIVE_CASE_STATUSES = [
      'WAITING_TRIAGE',
      'IN_COLLECTION',
      'NO_RESPONSE',
      'ELIGIBLE_FOR_CANCELLATION',
      'CANCELLATION_IN_PROGRESS',
    ] as const;

    const grouped = await this.prisma.collectionCase.groupBy({
      by: ['assignedUserId'],
      where: {
        assignedUserId: { not: null },
        status: { in: [...ACTIVE_CASE_STATUSES] },
      },
      _count: { _all: true },
    });

    const workloadByUserId = new Map(
      grouped
        .filter((g) => g.assignedUserId)
        .map((g) => [g.assignedUserId as string, g._count._all]),
    );

    return createApiResponse(
      Object.fromEntries(workloadByUserId) as Record<string, number>,
    );
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersRepository.findByEmail(email);

    if (existing) {
      throw new AppException(
        'Já existe um usuário com este e-mail.',
        HttpStatus.CONFLICT,
      );
    }

    const created = await this.usersRepository.create({
      email,
      name: dto.name,
      status: dto.status ?? UserStatus.ACTIVE,
      roleCodes: dto.roles,
    });

    return createApiResponse(toUserResponse(created));
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.requireUser(id);

    await this.guardLastActiveAdmin(existing, dto);

    const updated = await this.usersRepository.update(id, {
      name: dto.name,
      status: dto.status,
      roleCodes: dto.roles,
    });

    if (!updated) {
      throw new AppException('Usuário não encontrado.', HttpStatus.NOT_FOUND);
    }

    return createApiResponse(toUserResponse(updated));
  }

  private async requireUser(id: string): Promise<UserRecord> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new AppException('Usuário não encontrado.', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  /**
   * Impede que o ultimo administrador ativo perca o acesso (status != ACTIVE
   * ou remocao do papel ADMIN), o que bloquearia a gestao da plataforma.
   */
  private async guardLastActiveAdmin(
    current: UserRecord,
    dto: UpdateUserDto,
  ): Promise<void> {
    const isCurrentlyActiveAdmin =
      current.status === UserStatus.ACTIVE && current.roles.includes('ADMIN');

    if (!isCurrentlyActiveAdmin) {
      return;
    }

    const willBeInactive =
      dto.status !== undefined && dto.status !== UserStatus.ACTIVE;
    const willLoseAdmin =
      dto.roles !== undefined && !dto.roles.includes('ADMIN');

    if (!willBeInactive && !willLoseAdmin) {
      return;
    }

    const activeAdmins = await this.usersRepository.countActiveAdmins();

    if (activeAdmins <= 1) {
      throw new AppException(
        'Operação bloqueada: é necessário manter ao menos um administrador ativo.',
        HttpStatus.CONFLICT,
      );
    }
  }
}
