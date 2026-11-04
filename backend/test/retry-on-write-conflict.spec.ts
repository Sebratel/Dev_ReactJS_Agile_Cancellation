/* eslint-disable @typescript-eslint/no-unsafe-assignment -- matchers do jest (expect.*) retornam any */
import {
  isWriteConflictError,
  retryOnWriteConflict,
} from '@/common/utils/retry-on-write-conflict.util';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { BulkContactJobPrismaRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job-prisma.repository';

const conflict1020 = () =>
  new Error(
    'Error occurred during query execution: ConnectorError { kind: QueryError(Server(MysqlError { code: 1020, message: "Record has changed since last read in table \'bulk_contact_jobs\'; try restarting transaction", state: "HY000" })) }',
  );

describe('isWriteConflictError', () => {
  it('reconhece 1020 do MariaDB, deadlock 1213 e P2034 do Prisma', () => {
    expect(isWriteConflictError(conflict1020())).toBe(true);
    expect(
      isWriteConflictError(
        new Error('Deadlock found when trying to get lock; code: 1213'),
      ),
    ).toBe(true);
    expect(
      isWriteConflictError(Object.assign(new Error('x'), { code: 'P2034' })),
    ).toBe(true);
  });

  it('nao trata outros erros como conflito', () => {
    expect(isWriteConflictError(new Error('Unique constraint failed'))).toBe(
      false,
    );
    expect(
      isWriteConflictError(Object.assign(new Error('x'), { code: 'P2002' })),
    ).toBe(false);
    expect(isWriteConflictError(null)).toBe(false);
    expect(isWriteConflictError('1020')).toBe(false);
  });
});

describe('retryOnWriteConflict', () => {
  const sleep = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => sleep.mockClear());

  it('repete ate funcionar e devolve o resultado', async () => {
    const op = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(conflict1020())
      .mockRejectedValueOnce(conflict1020())
      .mockResolvedValue('ok');
    const onRetry = jest.fn();

    await expect(
      retryOnWriteConflict(op, { sleep, random: () => 1, onRetry }),
    ).resolves.toBe('ok');
    expect(op).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    // backoff exponencial (40 * 2^attempt) com jitter limitado
    expect(sleep).toHaveBeenNthCalledWith(1, 80);
    expect(sleep).toHaveBeenNthCalledWith(2, 160);
  });

  it('desiste apos o limite de tentativas e propaga o erro original', async () => {
    const error = conflict1020();
    const op = jest.fn<Promise<string>, []>().mockRejectedValue(error);

    await expect(retryOnWriteConflict(op, { attempts: 3, sleep })).rejects.toBe(
      error,
    );
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('nao repete erros que nao sao de conflito', async () => {
    const error = new Error('boom');
    const op = jest.fn<Promise<string>, []>().mockRejectedValue(error);

    await expect(retryOnWriteConflict(op, { sleep })).rejects.toBe(error);
    expect(op).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe('BulkContactJobPrismaRepository.recordItemResult (conflito 1020 sob concorrencia)', () => {
  it('repete a transacao inteira e conclui quando outra transacao alterou o job', async () => {
    const tx = {
      bulkContactJobItem: {
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(3),
      },
      bulkContactJob: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ startedAt: null }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const $transaction = jest
      .fn()
      .mockImplementationOnce(() => Promise.reject(conflict1020()))
      .mockImplementation((callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      );
    const repository = new BulkContactJobPrismaRepository({
      $transaction,
    } as unknown as PrismaService);

    await repository.recordItemResult({
      itemId: 'item-1',
      jobId: 'job-1',
      status: 'SENT',
    });

    expect($transaction).toHaveBeenCalledTimes(2);
    expect(tx.bulkContactJob.update).toHaveBeenCalledTimes(1);
    expect(tx.bulkContactJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sentCount: { increment: 1 } }),
      }),
    );
  });
});
