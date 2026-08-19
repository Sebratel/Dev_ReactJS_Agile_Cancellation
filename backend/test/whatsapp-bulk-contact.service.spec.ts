import { HttpStatus } from '@nestjs/common';
import { WhatsappBulkContactService } from '@/modules/whatsapp-bulk-contact/whatsapp-bulk-contact.service';
import type { BulkContactJobRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository';
import type { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';

function createRepository(
  overrides: Partial<BulkContactJobRepository> = {},
): BulkContactJobRepository {
  return {
    createJob: jest.fn(),
    getJob: jest.fn(),
    listJobs: jest.fn(),
    getPendingItems: jest.fn(),
    recordItemResult: jest.fn(),
    ...overrides,
  };
}

function createCollectionCasesService(
  overrides: Partial<CollectionCasesService> = {},
): CollectionCasesService {
  return {
    listCaseIds: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as CollectionCasesService;
}

describe('WhatsappBulkContactService', () => {
  it('cria job repassando caseIds e usuario para o repository', async () => {
    const job = {
      id: 'job_1',
      status: 'PENDING' as const,
      totalCount: 3,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
    };
    const createJob = jest.fn().mockResolvedValue(job);
    const service = new WhatsappBulkContactService(
      createRepository({ createJob }),
      createCollectionCasesService(),
    );

    const response = await service.createJob(
      ['case_1', 'case_2', 'case_3'],
      'usr_supervisor',
    );

    expect(createJob).toHaveBeenCalledWith(
      ['case_1', 'case_2', 'case_3'],
      'usr_supervisor',
    );
    expect(response.data).toEqual(job);
  });

  it('retorna 404 quando o job nao existe', async () => {
    const service = new WhatsappBulkContactService(
      createRepository({ getJob: jest.fn().mockResolvedValue(null) }),
      createCollectionCasesService(),
    );

    await expect(service.getJob('job_inexistente')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('retorna o job quando encontrado', async () => {
    const job = {
      id: 'job_1',
      status: 'COMPLETED' as const,
      totalCount: 2,
      sentCount: 2,
      skippedCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
    const service = new WhatsappBulkContactService(
      createRepository({ getJob: jest.fn().mockResolvedValue(job) }),
      createCollectionCasesService(),
    );

    const response = await service.getJob('job_1');
    expect(response.data).toEqual(job);
  });

  it('resolve o grupo pelos filtros e cria o job (envio por filtro)', async () => {
    const job = {
      id: 'job_2',
      status: 'PENDING' as const,
      totalCount: 2,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
    };
    const createJob = jest.fn().mockResolvedValue(job);
    const listCaseIds = jest.fn().mockResolvedValue(['case_1', 'case_2']);
    const service = new WhatsappBulkContactService(
      createRepository({ createJob }),
      createCollectionCasesService({ listCaseIds }),
    );

    const response = await service.createJobByFilter(
      { page: 1, limit: 10, contractStatus: 'SUSPENDED' },
      'usr_supervisor',
    );

    expect(listCaseIds).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      contractStatus: 'SUSPENDED',
    });
    expect(createJob).toHaveBeenCalledWith(
      ['case_1', 'case_2'],
      'usr_supervisor',
    );
    expect(response.data).toEqual(job);
  });

  it('rejeita envio por filtro quando nenhum caso corresponde', async () => {
    const service = new WhatsappBulkContactService(
      createRepository(),
      createCollectionCasesService({
        listCaseIds: jest.fn().mockResolvedValue([]),
      }),
    );

    await expect(
      service.createJobByFilter({ page: 1, limit: 10 }, 'usr_supervisor'),
    ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
  });

  it('lista o historico de jobs paginado', async () => {
    const paginated = {
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
    const listJobs = jest.fn().mockResolvedValue(paginated);
    const service = new WhatsappBulkContactService(
      createRepository({ listJobs }),
      createCollectionCasesService(),
    );

    const response = await service.listJobs(1, 10);

    expect(listJobs).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(response.data).toEqual(paginated);
  });
});
