import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BULK_CONTACT_JOB_REPOSITORY } from '@/common/data-source/data-source.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';
import type { CollectionCasesListParams } from '@/modules/collection-cases/repositories/collection-cases.repository';
import type { BulkContactJobRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository';

@Injectable()
export class WhatsappBulkContactService {
  constructor(
    @Inject(BULK_CONTACT_JOB_REPOSITORY)
    private readonly bulkContactJobRepository: BulkContactJobRepository,
    private readonly collectionCasesService: CollectionCasesService,
  ) {}

  async createJob(caseIds: string[], createdByUserId: string | null) {
    const job = await this.bulkContactJobRepository.createJob(
      caseIds,
      createdByUserId,
    );

    return createApiResponse(job);
  }

  // Tela dedicada de envio em lote: a supervisao filtra (mesmos filtros da
  // Supervisao) e o grupo inteiro que bater e enviado, sem marcar caso a
  // caso.
  async createJobByFilter(
    filters: CollectionCasesListParams,
    createdByUserId: string | null,
  ) {
    const caseIds = await this.collectionCasesService.listCaseIds(filters);

    if (caseIds.length === 0) {
      throw new AppException(
        'Nenhum caso encontrado para os filtros informados.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.createJob(caseIds, createdByUserId);
  }

  async getJob(jobId: string) {
    const job = await this.bulkContactJobRepository.getJob(jobId);

    if (!job) {
      throw new AppException(
        `Job de envio em lote ${jobId} não encontrado.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createApiResponse(job);
  }

  async listJobs(page: number, limit: number) {
    const paginated = await this.bulkContactJobRepository.listJobs({
      page,
      limit,
    });

    return createApiResponse(paginated);
  }
}
