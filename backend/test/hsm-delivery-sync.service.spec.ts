/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) retornam any */
import { Logger } from '@nestjs/common';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { getHsmDeliveryDbConfig } from '@/config/hsm-delivery-db.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { HsmDeliverySyncService } from '@/modules/hsm-delivery/hsm-delivery-sync.service';

const mockQuery = jest.fn();
const mockEnd = jest.fn();
const mockCreatePool = jest.fn();

jest.mock('mysql2/promise', () => ({
  createPool: (config: unknown) => {
    mockCreatePool(config);
    return { query: mockQuery, end: mockEnd };
  },
}));

jest.mock('@/config/hsm-delivery-db.config', () => ({
  getHsmDeliveryDbConfig: jest.fn(),
}));

jest.mock('@/common/data-source/data-source.config', () => ({
  getDataSourceMode: jest.fn(),
}));

const mockedConfig = jest.mocked(getHsmDeliveryDbConfig);
const mockedMode = jest.mocked(getDataSourceMode);

const CONFIG = {
  host: 'h',
  port: 3306,
  database: 'd',
  user: 'u',
  password: '',
};

function buildCase(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    matrixAttendanceCode: `ATD-${id}`,
    hsmDeliveryState: null,
    hsmDeliveryDetail: null,
    ...overrides,
  };
}

describe('HsmDeliverySyncService', () => {
  let findMany: jest.Mock;
  let update: jest.Mock<Promise<unknown>, [unknown]>;
  let service: HsmDeliverySyncService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    mockedConfig.mockReturnValue(CONFIG);
    mockedMode.mockReturnValue('database');
    findMany = jest.fn().mockResolvedValue([]);
    update = jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({});
    service = new HsmDeliverySyncService({
      collectionCase: { findMany, update },
    } as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('nao faz nada sem configuracao do banco ou fora do modo database', async () => {
    mockedConfig.mockReturnValue(null);
    await expect(service.sync()).resolves.toEqual({ checked: 0, updated: 0 });

    mockedConfig.mockReturnValue(CONFIG);
    mockedMode.mockReturnValue('mock');
    await expect(service.sync()).resolves.toEqual({ checked: 0, updated: 0 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('atualiza apenas os casos cujo estado ou detalhe mudou', async () => {
    findMany.mockResolvedValue([
      buildCase('1'),
      buildCase('2', {
        hsmDeliveryState: 'DELIVERED',
        hsmDeliveryDetail: 'Entregue',
      }),
      buildCase('3'),
      buildCase('4', { hsmDeliveryState: 'SENT' }),
    ]);
    mockQuery.mockResolvedValue([
      [
        {
          interaction_id: 'ATD-1',
          status_id: 1,
          status: ' Enviada ',
          sent_at: 1,
        },
        // O ultimo HSM do atendimento prevalece.
        { interaction_id: 'ATD-1', status_id: 3, status: 'Lida', sent_at: 2 },
        {
          interaction_id: 'ATD-2',
          status_id: 2,
          status: 'Entregue',
          sent_at: 1,
        },
        { interaction_id: 'ATD-4', status_id: 106, status: '   ', sent_at: 1 },
      ],
    ]);

    const result = await service.sync();

    expect(result).toEqual({ checked: 4, updated: 2 });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: expect.objectContaining({
        hsmDeliveryState: 'READ',
        hsmDeliveryDetail: 'Lida',
      }),
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: '4' },
      data: expect.objectContaining({
        hsmDeliveryState: 'FAILED',
        hsmDeliveryDetail: null,
      }),
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      ['ATD-1', 'ATD-2', 'ATD-3', 'ATD-4'],
    ]);
  });

  it('processa em lotes de 500 e reaproveita o pool', async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 501 }, (_, i) => buildCase(String(i))),
    );
    mockQuery.mockResolvedValue([[]]);

    const result = await service.sync();
    await service.sync();

    expect(result).toEqual({ checked: 501, updated: 0 });
    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(mockCreatePool).toHaveBeenCalledTimes(1);
  });

  it('trunca o detalhe em 255 caracteres', async () => {
    findMany.mockResolvedValue([buildCase('1')]);
    mockQuery.mockResolvedValue([
      [
        {
          interaction_id: 'ATD-1',
          status_id: 2,
          status: 'x'.repeat(400),
          sent_at: 1,
        },
      ],
    ]);

    await service.sync();

    const call = update.mock.calls[0]?.[0] as {
      data: { hsmDeliveryDetail: string };
    };
    expect(call.data.hsmDeliveryDetail).toHaveLength(255);
  });

  it('encerra o pool ao destruir o modulo (e tolera pool inexistente)', async () => {
    await service.onModuleDestroy();
    expect(mockEnd).not.toHaveBeenCalled();

    await service.sync();
    await service.onModuleDestroy();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  describe('handleScheduledSync', () => {
    const flush = () => new Promise((resolve) => setImmediate(resolve));

    it('dispara a sincronizacao e evita execucoes concorrentes', async () => {
      let release: (value: unknown) => void = () => undefined;
      findMany.mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve;
        }),
      );

      service.handleScheduledSync();
      service.handleScheduledSync();
      expect(findMany).toHaveBeenCalledTimes(1);

      release([]);
      await flush();

      findMany.mockResolvedValue([]);
      service.handleScheduledSync();
      await flush();
      expect(findMany).toHaveBeenCalledTimes(2);
    });

    it('registra o erro e libera a trava quando a sincronizacao falha', async () => {
      findMany.mockRejectedValueOnce(new Error('banco fora'));
      service.handleScheduledSync();
      await flush();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('banco fora'),
      );

      findMany.mockRejectedValueOnce('texto');
      service.handleScheduledSync();
      await flush();
      expect(errorSpy).toHaveBeenLastCalledWith(expect.any(String), 'texto');
    });
  });
});
