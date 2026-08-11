import { Module } from '@nestjs/common';
import { CollectionCasesController } from '@/modules/collection-cases/collection-cases.controller';
import { CollectionCasesService } from '@/modules/collection-cases/collection-cases.service';
import { collectionCasesRepositoryProvider } from '@/modules/collection-cases/repositories/collection-cases.repository.provider';
import { PerformedByResolverService } from '@/modules/collection-cases/services/performed-by-resolver.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CollectionCasesController],
  providers: [
    CollectionCasesService,
    PerformedByResolverService,
    collectionCasesRepositoryProvider,
  ],
})
export class CollectionCasesModule {}
