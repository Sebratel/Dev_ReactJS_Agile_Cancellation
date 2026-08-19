import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { CollectionCasesQueryDto } from '@/modules/collection-cases/dto/collection-cases-query.dto';
import { mapQueryDtoToListParams } from '@/modules/collection-cases/repositories/collection-cases.repository';
import { CreateBulkContactJobDto } from '@/modules/whatsapp-bulk-contact/dto/create-bulk-contact-job.dto';
import { ListBulkContactJobsQueryDto } from '@/modules/whatsapp-bulk-contact/dto/list-bulk-contact-jobs-query.dto';
import { WhatsappBulkContactService } from '@/modules/whatsapp-bulk-contact/whatsapp-bulk-contact.service';

// Rota propria (nao aninhada em /collection-cases) de proposito: um
// GET/POST de 1 segmento aqui (ex.: GET /collection-cases/bulk-contact-whatsapp)
// colidiria com o catch-all `GET /collection-cases/:id` do
// CollectionCasesController — e qual dos dois vence depende da ordem de
// registro dos modulos no Nest/Express, uma dependencia fragil demais para
// contar com ela. Um path de base totalmente separado elimina o risco.
@Controller('bulk-contact-whatsapp')
export class WhatsappBulkContactController {
  constructor(
    private readonly whatsappBulkContactService: WhatsappBulkContactService,
  ) {}

  // Restrito a supervisor/admin — o alcance de um disparo em massa (centenas
  // de clientes) justifica um nivel de permissao mais alto que o envio
  // individual (liberado tambem para o agente de cobranca).
  @Roles('SUPERVISOR', 'ADMIN')
  @Post()
  createJob(
    @Body() body: CreateBulkContactJobDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.whatsappBulkContactService.createJob(body.caseIds, user.id);
  }

  // Tela dedicada de envio em lote: em vez de uma lista de ids ja marcada,
  // recebe os mesmos filtros da Supervisao e resolve o grupo inteiro.
  @Roles('SUPERVISOR', 'ADMIN')
  @Post('by-filter')
  createJobByFilter(
    @Body() body: CollectionCasesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.whatsappBulkContactService.createJobByFilter(
      mapQueryDtoToListParams(body),
      user.id,
    );
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Get()
  listJobs(@Query() query: ListBulkContactJobsQueryDto) {
    return this.whatsappBulkContactService.listJobs(
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  @Roles('SUPERVISOR', 'ADMIN')
  @Get(':jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.whatsappBulkContactService.getJob(jobId);
  }
}
