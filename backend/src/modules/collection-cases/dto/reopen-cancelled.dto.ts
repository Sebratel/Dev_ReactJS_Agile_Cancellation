import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReopenCancelledDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  caseIds!: string[];

  @IsString()
  assignedUserId!: string;
}
