import { Module } from '@nestjs/common';
import { PreCollectionController } from '@/modules/pre-collection/pre-collection.controller';
import { PreCollectionService } from '@/modules/pre-collection/pre-collection.service';

@Module({
  controllers: [PreCollectionController],
  providers: [PreCollectionService],
})
export class PreCollectionModule {}
