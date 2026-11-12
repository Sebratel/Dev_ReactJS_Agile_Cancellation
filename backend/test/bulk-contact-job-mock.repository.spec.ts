import {
  BulkContactJobMockRepository,
  resetMockBulkContactJobs,
} from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job-mock.repository';

describe('BulkContactJobMockRepository', () => {
  const repository = new BulkContactJobMockRepository();

  beforeEach(() => {
    resetMockBulkContactJobs();
  });

  it('cria job com um item por caso, deduplicando ids repetidos', async () => {
    const job = await repository.createJob(
      ['case_1', 'case_2', 'case_1'],
      'usr_supervisor',
    );

    expect(job.totalCount).toBe(2);
    expect(job.status).toBe('PENDING');

    const pending = await repository.getPendingItems(10);
    expect(pending).toHaveLength(2);
    expect(pending.every((item) => item.jobId === job.id)).toBe(true);
    expect(
      pending.every((item) => item.createdByUserId === 'usr_supervisor'),
    ).toBe(true);
  });

  it('retorna null para job inexistente', async () => {
    expect(await repository.getJob('job_inexistente')).toBeNull();
  });

  it('atualiza contadores e conclui o job quando nao ha mais itens pendentes', async () => {
    const job = await repository.createJob(['case_1', 'case_2'], 'usr_1');
    const [first, second] = await repository.getPendingItems(10);

    await repository.recordItemResult({
      itemId: first!.itemId,
      jobId: job.id,
      status: 'SENT',
    });

    let updated = await repository.getJob(job.id);
    expect(updated?.status).toBe('PROCESSING');
    expect(updated?.sentCount).toBe(1);
    expect(updated?.startedAt).not.toBeNull();

    await repository.recordItemResult({
      itemId: second!.itemId,
      jobId: job.id,
      status: 'SKIPPED_PHONE',
      errorMessage: 'sem telefone',
    });

    updated = await repository.getJob(job.id);
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.skippedCount).toBe(1);
    expect(updated?.finishedAt).not.toBeNull();

    expect(await repository.getPendingItems(10)).toHaveLength(0);
  });

  it('nao retorna itens pendentes de jobs ja concluidos', async () => {
    const job = await repository.createJob(['case_1'], 'usr_1');
    const [item] = await repository.getPendingItems(10);

    await repository.recordItemResult({
      itemId: item!.itemId,
      jobId: job.id,
      status: 'FAILED',
      errorMessage: 'erro qualquer',
    });

    expect(await repository.getPendingItems(10)).toHaveLength(0);
  });
});
