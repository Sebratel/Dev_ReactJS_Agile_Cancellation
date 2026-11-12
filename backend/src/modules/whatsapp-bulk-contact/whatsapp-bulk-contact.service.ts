import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '@/modules/audit/audit.service';
import { BULK_CONTACT_JOB_REPOSITORY } from '@/common/data-source/data-source.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { createApiResponse } from '@/common/responses/api-response';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';
import type { CollectionCasesListParams } from '@/modules/collection-cases/repositories/collection-cases.repository';
import type { BulkContactJobRepository } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository';

// Filtros efetivos do envio (sem paginação/ordem), para a auditoria.
function summarizeFilters(
  params: CollectionCasesListParams,
): Record<string, string> {
  const ignored = new Set(['page', 'limit', 'sortBy', 'sortDirection']);
  const summary: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (ignored.has(key) || value === undefined || value === null) continue;
    if (value === '' || (Array.isArray(value) && value.length === 0)) continue;
    summary[key] = Array.isArray(value) ? value.join(',') : String(value);
  }

  return summary;
}

@Injectable()
export class WhatsappBulkContactService {
  constructor(
    @Inject(BULK_CONTACT_JOB_REPOSITORY)
    private readonly bulkContactJobRepository: BulkContactJobRepository,
    private readonly collectionCasesService: CollectionCasesService,
    // Opcional: sem o serviço de auditoria (testes), nada é gravado.
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async createJob(
    caseIds: string[],
    createdByUserId: string | null,
    filters?: Record<string, string>,
  ) {
    const job = await this.bulkContactJobRepository.createJob(
      caseIds,
      createdByUserId,
    );

    await this.auditService?.record({
      action: AuditAction.CREATE,
      entityType: 'BULK_CONTACT_JOB',
      entityId: job.id,
      performedByUserId: createdByUserId,
      metadata: {
        resourceType: 'BULK_CONTACT_JOB',
        total: caseIds.length,
        mode: filters ? 'FILTER' : 'SELECTION',
        ...(filters ? { filters } : {}),
      },
    });

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

    return this.createJob(caseIds, createdByUserId, summarizeFilters(filters));
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
