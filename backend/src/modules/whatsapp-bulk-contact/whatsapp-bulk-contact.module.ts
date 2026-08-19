import { Module } from '@nestjs/common';
import { CollectionCasesModule } from '@/modules/collection-cases/collection-cases.module';
import { bulkContactJobRepositoryProvider } from '@/modules/whatsapp-bulk-contact/repositories/bulk-contact-job.repository.provider';
import { WhatsappBulkContactController } from '@/modules/whatsapp-bulk-contact/whatsapp-bulk-contact.controller';
import { WhatsappBulkContactService } from '@/modules/whatsapp-bulk-contact/whatsapp-bulk-contact.service';
import { WhatsappBulkContactWorkerService } from '@/modules/whatsapp-bulk-contact/whatsapp-bulk-contact-worker.service';

@Module({
  imports: [CollectionCasesModule],
  controllers: [WhatsappBulkContactController],
  providers: [
    WhatsappBulkContactService,
    WhatsappBulkContactWorkerService,
    bulkContactJobRepositoryProvider,
  ],
})
export class WhatsappBulkContactModule {}
