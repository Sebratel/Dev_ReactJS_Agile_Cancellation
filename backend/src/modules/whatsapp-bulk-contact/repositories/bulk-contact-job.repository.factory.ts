import { getDataSourceMode } from '@/common/data-source/data-source.config';
import type { PrismaService } from '@/database/prisma/prisma.service';
import { BulkContactJobMockRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job-mock.repository';
import { BulkContactJobPrismaRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job-prisma.repository';
import type { BulkContactJobRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository';

export function createBulkContactJobRepository(
  prisma: PrismaService,
): BulkContactJobRepository {
  if (getDataSourceMode() === 'database') {
    return new BulkContactJobPrismaRepository(prisma);
  }

  return new BulkContactJobMockRepository();
}
