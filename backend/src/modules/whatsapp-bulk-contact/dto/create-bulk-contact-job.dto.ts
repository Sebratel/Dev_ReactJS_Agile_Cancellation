import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';
import { BULK_CONTACT_MAX_CASES } from '@/common/constants/bulk-contact.constants';

export class CreateBulkContactJobDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_CONTACT_MAX_CASES)
  @IsString({ each: true })
  caseIds!: string[];
}
