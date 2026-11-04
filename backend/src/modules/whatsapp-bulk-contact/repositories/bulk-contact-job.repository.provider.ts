import type { Provider } from '@nestjs/common';
import { BULK_CONTACT_JOB_REPOSITORY } from '@/common/data-source/data-source.constants';
import { PrismaService } from '@/database/prisma/prisma.service';
import { createBulkContactJobRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository.factory';

export const bulkContactJobRepositoryProvider: Provider = {
  provide: BULK_CONTACT_JOB_REPOSITORY,
  useFactory: (prisma: PrismaService) => createBulkContactJobRepository(prisma),
  inject: [PrismaService],
};
