import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { IngestCollectionCasesDto } from '@/modules/webhooks/dto/ingest-collection-cases.dto';
import { WebhookAuthGuard } from '@/modules/webhooks/guards/webhook-auth.guard';
import { WebhooksService } from '@/modules/webhooks/webhooks.service';

@Controller('webhooks/n8n')
@Public()
@UseGuards(WebhookAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('collection-cases')
  @HttpCode(HttpStatus.ACCEPTED)
  ingestCollectionCases(@Body() body: IngestCollectionCasesDto) {
    return this.webhooksService.ingestCollectionCases(body);
  }
}
