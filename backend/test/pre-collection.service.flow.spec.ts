/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) retornam any */
import { Logger } from '@nestjs/common';
import { getDataSourceMode } from '@/common/data-source/data-source.config';
import { getErpSyncConfig } from '@/config/erp-sync.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { PreCollectionService } from '@/modules/pre-collection/pre-collection.service';

const mockQuery = jest.fn();
const mockPoolCtor = jest.fn();

jest.mock('pg', () => ({
  Pool: class {
    constructor(config: unknown) {
      mockPoolCtor(config);
    }
    query(...args: unknown[]) {
      return mockQuery(...args) as unknown;
    }
    on() {
      return this;
    }
  },
}));

jest.mock('@/config/erp-sync.config', () => ({
  getErpSyncConfig: jest.fn(),
}));

jest.mock('@/common/data-source/data-source.config', () => ({
  getDataSourceMode: jest.fn(),
}));

const mockedConfig = jest.mocked(getErpSyncConfig);
const mockedMode = jest.mocked(getDataSourceMode);

const DB = {
  host: 'erp',
  port: 5432,
  database: 'db',
  user: 'u',
  password: '',
};

function isoDaysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    contract_external_id: 'EXT-1',
    contract_number: 'CTR-1',
    contract_status: 'Bloqueio Financeiro',
    customer_name: ' Maria ',
    document: ' 12345678900 ',
    phone: ' 51999990000 ',
    first_overdue_date: isoDaysFromNow(-10),
    first_overdue_amount: '100',
    second_due_date: isoDaysFromNow(3),
    second_due_amount: '50.5',
    ...overrides,
  };
}

function buildPrisma() {
  return {
    customer: { upsert: jest.fn().mockResolvedValue({ id: 'cus-1' }) },
    contract: { upsert: jest.fn().mockResolvedValue({ id: 'ctr-1' }) },
    collectionCase: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'case-new' }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockReturnValue('update-op'),
    },
    invoice: {
      count: jest.fn().mockResolvedValue(0),
      upsert: jest.fn().mockResolvedValue({}),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

describe('PreCollectionService', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: PreCollectionService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    mockedConfig.mockReturnValue({ enabled: true, db: DB });
    mockedMode.mockReturnValue('database');
    prisma = buildPrisma();
    service = new PreCollectionService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('refreshCache e list', () => {
    it('sem cache responde "atualizando" e dispara o carregamento', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const response = service.list(undefined);

      expect(response.data).toEqual(
        expect.objectContaining({
          daysWindow: 7,
          generatedAt: null,
          refreshing: true,
          total: 0,
        }),
      );
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('carrega o snapshot do ERP e filtra pela janela de dias', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          buildRow(),
          buildRow({
            contract_number: 'CTR-2',
            second_due_date: isoDaysFromNow(12),
          }),
        ],
        rowCount: 2,
      });

      await service.refreshCache();

      const short = service.list(5).data;
      expect(short.total).toBe(1);
      expect(short.items[0]).toEqual(
        expect.objectContaining({
          contractCode: 'CTR-1',
          customerName: 'Maria',
          customerDocument: '12345678900',
          customerPhone: '51999990000',
          firstOverdueAmount: '100.00',
          secondDueAmount: '50.50',
          totalOpenAmount: '150.50',
          daysUntilSecond: 3,
        }),
      );
      expect(short.refreshing).toBe(false);
      expect(service.list(15).data.total).toBe(2);
    });

    it('aplica valores padrao para campos ausentes e datas em texto', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          buildRow({
            contract_number: null,
            contract_status: null,
            customer_name: '   ',
            document: null,
            phone: null,
            first_overdue_date: '2026-01-01',
            second_due_date: '2026-01-05',
            second_due_amount: null,
          }),
        ],
        rowCount: 1,
      });

      await service.refreshCache();

      const item = service.list(15).data.items[0];
      expect(item).toEqual(
        expect.objectContaining({
          contractCode: '',
          contractErpStatus: null,
          customerName: 'Cliente',
          customerDocument: null,
          customerPhone: null,
          firstOverdueDate: '2026-01-01',
          secondDueAmount: '0.00',
          daysUntilSecond: 0,
        }),
      );
    });

    it('sem banco do ERP ou fora do modo database o snapshot fica vazio', async () => {
      mockedConfig.mockReturnValue({ enabled: false, db: null });
      await service.refreshCache();
      expect(mockQuery).not.toHaveBeenCalled();
      expect(service.list(7).data.total).toBe(0);
      expect(service.list(7).data.generatedAt).not.toBeNull();

      mockedConfig.mockReturnValue({ enabled: true, db: DB });
      mockedMode.mockReturnValue('mock');
      await service.refreshCache();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('registra erro e libera o refresh quando a consulta falha', async () => {
      mockQuery.mockRejectedValueOnce(new Error('conexao caiu'));
      await service.refreshCache();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('conexao caiu'),
      );

      mockQuery.mockRejectedValueOnce('texto puro');
      await service.refreshCache();
      expect(errorSpy).toHaveBeenLastCalledWith(
        expect.any(String),
        'texto puro',
      );
    });

    it('nao executa refresh concorrente e reaproveita o pool', async () => {
      let release: (value: unknown) => void = () => undefined;
      mockQuery.mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve;
        }),
      );

      const first = service.refreshCache();
      await service.refreshCache();
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(service.list(7).data.refreshing).toBe(true);
      release({ rows: [], rowCount: 0 });
      await first;

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await service.refreshCache();
      expect(mockPoolCtor).toHaveBeenCalledTimes(1);
    });

    it('onModuleInit e o cron disparam o refresh em background', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      service.onModuleInit();
      await new Promise((resolve) => setImmediate(resolve));
      service.handleScheduledRefresh();
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('distribute', () => {
    async function loadCache(rows: Record<string, unknown>[]) {
      mockQuery.mockResolvedValue({ rows, rowCount: rows.length });
      await service.refreshCache();
    }

    it('retorna zeros sem cache ou fora do modo database', async () => {
      const zero = {
        eligible: 0,
        skipped: 0,
        created: 0,
        existing: 0,
        distributed: 0,
        agents: 0,
      };
      await expect(service.distribute()).resolves.toEqual(zero);

      await loadCache([buildRow()]);
      mockedMode.mockReturnValue('mock');
      await expect(service.distribute()).resolves.toEqual(zero);
    });

    it('ignora itens sem documento e itens fora da janela de distribuicao', async () => {
      await loadCache([
        buildRow({ document: null }),
        buildRow({ second_due_date: isoDaysFromNow(10) }),
      ]);

      const result = await service.distribute();

      expect(result).toEqual(
        expect.objectContaining({ eligible: 1, skipped: 1, created: 0 }),
      );
      expect(prisma.customer.upsert).not.toHaveBeenCalled();
    });

    it('cria o caso, as faturas sinteticas e distribui entre os agentes', async () => {
      await loadCache([buildRow()]);
      prisma.collectionCase.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
        { id: 'c3' },
      ]);
      prisma.user.findMany.mockResolvedValue([{ id: 'ag1' }, { id: 'ag2' }]);

      const result = await service.distribute();

      expect(result).toEqual({
        eligible: 1,
        skipped: 0,
        created: 1,
        existing: 0,
        distributed: 3,
        agents: 2,
      });
      expect(prisma.contract.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'SUSPENDED' }),
        }),
      );
      expect(prisma.invoice.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.collectionCase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'WAITING_TRIAGE',
          origin: 'PRE_COLLECTION',
          outstandingAmount: 150.5,
          daysOverdue: expect.any(Number),
        }),
      });
      expect(prisma.collectionCase.updateMany).toHaveBeenCalledTimes(2);
      expect(prisma.collectionCase.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['c1', 'c3'] } } }),
      );
      expect(prisma.$transaction).toHaveBeenCalledWith([
        'update-op',
        'update-op',
      ]);
    });

    it('nao duplica faturas quando a real do ERP ja existe e conta casos existentes', async () => {
      await loadCache([buildRow({ contract_status: 'Normal' })]);
      prisma.invoice.count.mockResolvedValue(1);
      prisma.collectionCase.findFirst.mockResolvedValue({ id: 'case-old' });

      const result = await service.distribute();

      expect(prisma.invoice.upsert).not.toHaveBeenCalled();
      expect(prisma.collectionCase.create).not.toHaveBeenCalled();
      expect(prisma.contract.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ existing: 1, created: 0, distributed: 0 }),
      );
    });

    it('nao distribui quando nao ha agentes ativos', async () => {
      await loadCache([buildRow()]);
      prisma.collectionCase.findMany.mockResolvedValue([{ id: 'c1' }]);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.distribute();

      expect(result.distributed).toBe(0);
      expect(result.agents).toBe(0);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
