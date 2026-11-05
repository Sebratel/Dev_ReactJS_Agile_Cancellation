import { HttpStatus } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { AppException } from '@/common/exceptions/app.exception';
import { UsersService } from '@/modules/users/users.service';
import { UsersMockRepository } from '@/modules/users/repositories/users-mock.repository';

function buildRepository(): UsersMockRepository {
  const repository = new UsersMockRepository();
  repository.onModuleInit();
  return repository;
}

describe('UsersService (mock)', () => {
  let repository: UsersMockRepository;
  let service: UsersService;

  beforeEach(() => {
    repository = buildRepository();
    service = new UsersService(repository, {} as never);
  });

  it('lista usuarios paginados', async () => {
    const response = await service.list({ page: 1, limit: 3 });

    expect(response.data.items).toHaveLength(3);
    expect(response.data.pagination.total).toBeGreaterThan(3);
  });

  it('filtra por papel', async () => {
    const response = await service.list({ page: 1, limit: 20, role: 'ADMIN' });

    expect(response.data.items.length).toBeGreaterThan(0);
    response.data.items.forEach((user) => {
      expect(user.roles).toContain('ADMIN');
    });
  });

  it('lista apenas agentes de cancelamento ativos', async () => {
    const response = await service.listCancellationAgents();

    expect(response.data.items.length).toBeGreaterThan(0);
    response.data.items.forEach((user) => {
      expect(user.roles).toContain('CANCELLATION_AGENT');
      expect(user.status).toBe('ACTIVE');
    });
  });

  it('cria um usuario sem senha, liberado para login via Google', async () => {
    const response = await service.create({
      email: 'novo@ger.local',
      name: 'Novo Usuario',
      roles: ['COLLECTION_AGENT'],
    });

    expect(response.data.email).toBe('novo@ger.local');
    expect(response.data.roles).toEqual(['COLLECTION_AGENT']);
    expect(JSON.stringify(response.data)).not.toContain('passwordHash');
  });

  it('rejeita e-mail duplicado com 409', async () => {
    await expect(
      service.create({
        email: 'admin@ger.local',
        name: 'Duplicado',
        roles: ['VIEWER'],
      }),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it('retorna 404 ao buscar usuario inexistente', async () => {
    await expect(service.getById('nao-existe')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('atualiza nome e status de um usuario', async () => {
    const response = await service.update('user-viewer', {
      name: 'Viewer Renomeado',
      status: UserStatus.INACTIVE,
    });

    expect(response.data.name).toBe('Viewer Renomeado');
    expect(response.data.status).toBe(UserStatus.INACTIVE);
  });

  it('impede desativar o ultimo administrador ativo', async () => {
    await expect(
      service.update('user-admin', { status: UserStatus.INACTIVE }),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it('permite desativar admin quando ha outro admin ativo', async () => {
    await service.create({
      email: 'admin2@ger.local',
      name: 'Segundo Admin',
      roles: ['ADMIN'],
    });

    const response = await service.update('user-admin', {
      status: UserStatus.INACTIVE,
    });

    expect(response.data.status).toBe(UserStatus.INACTIVE);
  });
});
