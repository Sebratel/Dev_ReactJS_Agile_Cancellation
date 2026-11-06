import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { CollectionCasesController } from '@/modules/collection-cases/collection-cases.controller';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';
import { collectionCasesRepositoryProvider } from '@/modules/collection-cases/repositories/collection-cases.repository.provider';
import { MatrixWhatsappContactService } from '@/modules/collection-cases/services/matrix-whatsapp-contact.service';
import { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { SettingsModule } from '@/modules/settings/settings.module';

@Module({
  imports: [AuditModule, NotificationsModule, SettingsModule],
  controllers: [CollectionCasesController],
  providers: [
    CollectionCasesService,
    MatrixWhatsappContactService,
    PerformedByResolverService,
    collectionCasesRepositoryProvider,
  ],
  exports: [CollectionCasesService],
})
export class CollectionCasesModule {}
