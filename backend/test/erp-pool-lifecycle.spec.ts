import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { getErpSyncConfig } from '@/config/erp-sync.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { ErpSyncService } from '@/modules/erp-sync/erp-sync.service';
import { PreCollectionService } from '@/modules/pre-collection/pre-collection.service';

const mockEnd = jest.fn();
const mockQuery = jest.fn();
const pools: EventEmitter[] = [];

jest.mock('pg', () => ({
  Pool: class extends EventEmitter {
    constructor() {
      super();
      pools.push(this);
    }
    query(...args: unknown[]) {
      return mockQuery(...args) as unknown;
    }
    end() {
      return mockEnd() as unknown;
    }
  },
}));

jest.mock('@/config/erp-sync.config', () => ({
  getErpSyncConfig: jest.fn(),
}));

jest.mock('@/common/data-source/data-source.config', () => ({
  getDataSourceMode: jest.fn(),
}));

const DB = { host: 'erp', port: 5432, database: 'db', user: 'u', password: '' };

function buildErpService() {
  const prisma = {
    collectionCase: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;

  return new ErpSyncService({} as never, prisma, {} as never, {} as never);
}

let errorSpy: jest.SpyInstance;

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ciclo de vida dos pools pg do ERP (regressao: leak no shutdown e crash)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pools.length = 0;
    jest.mocked(getErpSyncConfig).mockReturnValue({ enabled: true, db: DB });
    jest.mocked(getDataSourceMode).mockReturnValue('database');
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ErpSyncService encerra o pool ao destruir o modulo e tolera pool inexistente', async () => {
    const service = buildErpService();

    await service.onModuleDestroy();
    expect(mockEnd).not.toHaveBeenCalled();

    await service.runSync();
    expect(pools).toHaveLength(1);

    await service.onModuleDestroy();
    expect(mockEnd).toHaveBeenCalledTimes(1);

    // segunda chamada nao tenta encerrar de novo
    await service.onModuleDestroy();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it('ErpSyncService reaproveita um unico pool entre consultas', async () => {
    const service = buildErpService();

    await service.runSync();
    await service.runSync();

    expect(pools).toHaveLength(1);
  });

  it('erro em conexao ociosa do pool do ERP e logado e nao derruba o processo', async () => {
    const service = buildErpService();
    await service.runSync();

    expect(() =>
      pools[0]?.emit('error', new Error('ECONNRESET')),
    ).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ECONNRESET'),
    );
  });

  it('rodada agendada que falha e logada (sem unhandledRejection) e libera a trava', async () => {
    const service = buildErpService();
    const runSync = jest
      .spyOn(service, 'runSync')
      .mockRejectedValueOnce(new Error('MariaDB 1020'))
      .mockResolvedValue();

    service.handleScheduledSync();
    await flush();

    expect(errorSpy).toHaveBeenCalledWith(
      'Falha inesperada na sincronizacao com o ERP.',
      expect.stringContaining('MariaDB 1020'),
    );

    // a trava foi liberada: a proxima rodada executa
    service.handleScheduledSync();
    await flush();
    expect(runSync).toHaveBeenCalledTimes(2);
  });

  it('PreCollectionService encerra o pool ao destruir o modulo e loga erro do pool', async () => {
    const prisma = {} as unknown as PrismaService;
    const service = new PreCollectionService(prisma);

    await service.onModuleDestroy();
    expect(mockEnd).not.toHaveBeenCalled();

    await service.refreshCache();
    expect(pools).toHaveLength(1);
    expect(() => pools[0]?.emit('error', new Error('EPIPE'))).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('EPIPE'));

    await service.onModuleDestroy();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
