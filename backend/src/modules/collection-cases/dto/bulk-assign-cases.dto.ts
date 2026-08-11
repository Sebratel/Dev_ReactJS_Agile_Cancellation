import { IsArray, IsOptional, IsString } from 'class-validator';

export class BulkAssignCasesDto {
  @IsArray()
  @IsString({ each: true })
  caseIds!: string[];

  @IsString()
  @IsOptional()
  assignedUserId?: string | null;
}
